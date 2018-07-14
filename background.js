// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const CALENDAR_NAME = "SJSU Schedule";

const FINAL_EXAM_DATA_BASE_URL = 'https://raw.githubusercontent.com/TylerWasniowski/sjsu-class-schedule-exporter/master/final_exam_data/';


// Message sent with classes object upon button click
chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        if (request.schedule && request.schedule.classes.length > 0) {
            exportSchedule(request.schedule);
            sendResponse('schedule_received');
        } else if (request.schedule && request.classes.length == 0)
            sendResponse('classes_empty');
        else
            sendResponse('no_schedule');
    });

function exportSchedule(schedule) {
    console.log(schedule);
    ensureCalendar((calendar) => {
        // Get final exam data for given semester, then create final exam events
        getFinalExamData(
            schedule.semester,
            (finalExamData) => {
                schedule.class.forEach((classObj) => {
                    createFinalExamEvent(calendar, classObj, finalExamData);
                })
            }
        );

        schedule.classes.forEach((classObj) => {
            createClassEvent(calendar, classObj);
        });
    });
}

function createClassEvent(calendar, classObj) {
    console.log('create event function');
    console.log(classObj);

    const startDate = moment(classObj.startDate, 'MM-DD-YYYY');
    const endDate = moment(classObj.endDate, 'MM-DD-YYYY');

    const firstDate = getFirstDate(startDate, classObj.days);
    const startTime = moment.tz(firstDate.format('MM-DD-YYYY') + ' ' + classObj.startTime,
        'MM-DD-YYYY HH:mm', 'America/Los_Angeles');
    const endTime = moment.tz(firstDate.format('MM-DD-YYYY') + ' ' + classObj.endTime,
        'MM-DD-YYYY HH:mm', 'America/Los_Angeles');

    const eventData = {
        summary: classObj.className + " - " + classObj.componentName,
        description: "Instructor: " + classObj.instructor + "\n" +
            "Section: " + classObj.section + "\n" +
            "Class Number: " + classObj.classNumber,
        location: classObj.room,
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
            // Adding 1 here because UNTIL is exclusive, but endDate is inclusive
            'UNTIL=' + endDate.add({
                days: 1
            }).format('YYYYMMDD') + ';' +
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
        ]
    };

    console.log(eventData);

    makeRequest('POST',
        '/calendars/' + calendar.id + '/events',
        JSON.stringify(eventData),
        (response) => {
            console.log('created event');
        });
}

function createFinalExamEvent(calendar, classObj, finalExamData) {


}

// Creates the Calendar if it does not exist, calls callback with calendar
function ensureCalendar(callback) {
    // Check if calendar exists
    makeRequest('GET', '/users/me/calendarList', null, (response) => {
        response = JSON.parse(response);

        // Calendar already exists
        if (response.items.some((calendar) => {
                calendar.summary == CALENDAR_NAME
            })) {
            callback(calendar);
            return;
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
    chrome.identity.getAuthToken({
        interactive: true
    }, (token) => {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
            return;
        }

        let x = new XMLHttpRequest();
        x.open(method, 'https://www.googleapis.com/calendar/v3' + uri);
        x.setRequestHeader('Authorization', 'Bearer ' + token);
        x.setRequestHeader('Content-Type', 'application/json');
        x.onload = () => {
            callback(x.response);
        };
        x.send(body);
    });
}

// Returns a moment object containing the next occurence of one of the days
function getFirstDate(startDate, days) {
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
        if (daysArr[startDate.days() + offset])
            return moment(startDate).days(startDate.days() + offset);
    }
}

// Calls the callback with the final exam data
function getFinalExamData(semester, callback) {
    fetch(FINAL_EXAM_DATA_BASE_URL + semester + '.json')
        .then(
            (response) => response.json(),
            (response) => {
                alert("Failed to get final data. See background console for more info.");
                console.error(response);
            }
        )
        .then(
            callback,
            (response) => {
                alert("Failed to parse final data. See background console for more info.");
                console.error(response);
            }
        );
}

function getFinalExamGroup(classObj, finalExamData) {
    if (
        moment(classObj.startTime, 'HH:mm')
        .isSameOrAfter(moment(finalExamData.lateClassesStartTime, 'HH:mm'), 'minute')
    )
        return finalExamData.groups.lateClasses;
    else if (finalExamData.groupIPattern.find((pattern) => isPatternMatching(pattern, days)))
        return finalExamData.groups.groupI;
    else
        return finalExamData.groups.groupII;
}

// Returns true if days matches the given pattern, false if not.
// See final_exam_data\scraper for more info.
function isPatternMatching(pattern, days) {
    Object.keys(pattern)
        .forEach((day) => {
            if (pattern[day] != days[day])
                return false;
        });
    return true;
}