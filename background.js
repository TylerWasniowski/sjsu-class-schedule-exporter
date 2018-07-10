// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const HOST = "cmsweb.cms.sjsu.edu";

const CALENDAR_NAME = "SJSU Schedule";


chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: {
          hostEquals: HOST
        },
      })],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
});

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

function createClassEvent(calendar, classObj) {
  console.log('create event function');
  console.log(classObj);
  // makeRequest('', );
}

function exportClasses(classes) {
  console.log(classes);
  ensureCalendar((calendar) => {
    classes.forEach((classObj) => {
      createClassEvent(calendar, classObj);
    });
  });
}

// Creates the Calendar if it does not exist, calls callback with calendar
function ensureCalendar(callback) {
  // Check if calendar exists
  makeRequest('GET', '/users/me/calendarList', null, (response) => {
    response = JSON.parse(response);
    console.log(response);

    if (!response.items) {
      console.error("Calendars array missing from response after querying Calendar API");
      return;
    }

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