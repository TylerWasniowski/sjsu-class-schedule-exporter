// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const CALENDAR_NAME = "SJSU Schedule";


// Message sent with classes object upon button click
chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    if (request.classes && request.classes.length > 0) {
      exportClasses(request.classes);
      sendResponse('classes_received');
    } else if (request.classes && request.classes.length == 0)
      sendResponse('classes_empty');
    else
      sendResponse('no_classes');
  });

function exportClasses(classes) {
  console.log(classes);
  ensureCalendar((calendar) => {
    classes.forEach((classObj) => {
      createClassEvent(calendar, classObj);
    });
  });
}

function createClassEvent(calendar, classObj) {
  console.log('create event function');
  console.log(classObj);

  const firstDate = getFirstDate(classObj.startDate, classObj.days);
  const startTime = moment.tz(firstDate.format('MM-DD-YYYY') + ' ' + classObj.startTime,
    'MM-DD-YYYY HH:mm', 'America/Los_Angeles');
  const endTime = moment.tz(firstDate.format('MM-DD-YYYY') + ' ' + classObj.endTime,
    'MM-DD-YYYY HH:mm', 'America/Los_Angeles');

  const eventData = {
    summary: classObj.className + " - " + classObj.componentName,
    description: 
      "Instructor: " + classObj.instructor + "\n" +
      "Section: " + classObj.section + "\n" +
      "Class Number: " + classObj.classNumber
    ,
    start: {
      dateTime: startTime.utc().format(),
      timeZone: 'UTC'
    },
    end: {
      dateTime: endTime.utc().format(),
      timeZone: 'UTC'
    },
    recurrence: [
      'RRULE:' +
        'FREQ=WEEKLY;' + 
        'UNTIL=' + moment(classObj.endDate).add({days: 1}).format('YYYYMMDD') + ';' +
        'BYDAY=' +
          (
            (classObj.days.sunday ? 'SU,' : '') +
            (classObj.days.monday ? 'MO,' : '') +
            (classObj.days.tuesday ? 'TU,' : '') +
            (classObj.days.wednesday ? 'WE,' : '') +
            (classObj.days.thursday ? 'TH,' : '') +
            (classObj.days.friday ? 'FR,' : '') +
            (classObj.days.saturday ? 'SA,' : '')
          ).slice(0, -1) + ';'
    ],
    location: classObj.room
  };

  console.log(eventData);

  makeRequest('POST',
    '/calendars/' + calendar.id + '/events',
    JSON.stringify(eventData),
    (response) => {
      console.log('created event');
    });
}

// Creates the Calendar if it does not exist, calls callback with calendar
function ensureCalendar(callback) {
  // Check if calendar exists
  makeRequest('GET', '/users/me/calendarList', null, (response) => {
    response = JSON.parse(response);
    console.log('Calendar list');
    console.log(response);

    for (let i = 0; i < response.items.length; i++) {
      const calendar = response.items[i];
      if (calendar.summary == CALENDAR_NAME) {
        // Calendar already exists
        callback(calendar);
        return;
      }
    }

    createCalendar(callback);
  });
}

// Calls callback with created calendar
function createCalendar(callback) {
  const options = {
    summary: CALENDAR_NAME
  };

  makeRequest('POST', '/calendars', JSON.stringify(options), (response) => {
    console.log('Calendar created');
    const calendar = JSON.parse(response);
    callback(calendar);
  })
}

// Makes Google Calendar API request
function makeRequest(method, uri, body, callback) {
  console.log('making request');
  chrome.identity.getAuthToken({
    interactive: true
  }, (token) => {
    console.log('auth callback');
    if (chrome.runtime.lastError) {
      console.log(chrome.runtime.lastError.message);
      return;
    }
    var x = new XMLHttpRequest();
    x.open(method, 'https://www.googleapis.com/calendar/v3' + uri);
    x.setRequestHeader('Authorization', 'Bearer ' + token);
    x.setRequestHeader('Content-Type', 'application/json');
    x.onload = () => {
      callback(x.response);
    };
    x.send(body);

    console.log('token sent');
  });
}

// Returns a moment object containing the next occurence of one of the days
function getFirstDate(startDate, days) {
  const startDay = moment(startDate).days();
  const daysArr = [
    days.sunday,
    days.monday,
    days.tuesday,
    days.wednesday,
    days.thursday,
    days.friday,
    days.saturday,
  ];
  
  for (let offset = 0; offset < daysArr.length; offset++) {
    if (daysArr[startDay + offset])
      return moment(startDate).days(startDay + offset);
  }
}