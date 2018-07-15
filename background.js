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
                schedule.classes.forEach((classObj) => {
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
    console.log('Create class event function');
    console.log('Class:')
    console.log(classObj);

    const startDateObj = moment(classObj.startDate, 'MM-DD-YYYY');
    const endDate = moment(classObj.endDate, 'MM-DD-YYYY');

    const firstDateObj = getFirstDate(startDateObj, classObj.days);
    const startTime = moment.tz(firstDateObj.format('MM-DD-YYYY') + ' ' + classObj.startTime,
        'MM-DD-YYYY HH:mm', 'America/Los_Angeles')
        .utc()
        .format();
    const endTime = moment.tz(firstDateObj.format('MM-DD-YYYY') + ' ' + classObj.endTime,
        'MM-DD-YYYY HH:mm', 'America/Los_Angeles')
        .utc()
        .format();

    const eventData = {
        summary: classObj.className + " - " + classObj.componentName,
        description: "Instructor: " + classObj.instructor + "\n" +
            "Section: " + classObj.section + "\n" +
            "Class Number: " + classObj.classNumber,
        location: classObj.room,
        start: {
            dateTime: startTime,
            timeZone: 'UTC'
        },
        end: {
            dateTime: endTime,
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

    console.log('Class eventData:');
    console.log(eventData);

    makeRequest('POST',
        '/calendars/' + calendar.id + '/events',
        JSON.stringify(eventData),
        (response) => {
            console.log('created event');
        });
}

function createFinalExamEvent(calendar, classObj, finalExamData) {
    console.log('create class event function');
    console.log('class:')
    console.log(classObj);

    const groupName = getFinalExamGroupName(classObj, finalExamData);
    const group = finalExamData.groups[groupName];

    const classStartTimeObj = moment(classObj.startTime, 'HH:mm');

    let examInfo;
    if (groupName == 'groupI' || groupName == 'groupII') {
        examInfo = group.find((examInfo) =>
            classStartTimeObj.isBetween(
                moment(examInfo.classStartTimes.timeRangeStart, 'HH:mm'),
                moment(examInfo.classStartTimes.timeRangeEnd, 'HH:mm'),
                null,
                '[]'
            )
        );
    } else {
        examInfo = group.find((examInfo) => {
            // The day of the week for which this examInfo applies
            const classStartDay = moment(examInfo.classStartTimes.dayOfWeek, 'E')
                .format('dddd')
                .toLowerCase();

            return classObj.days[classStartDay] &&
                classStartTimeObj.isBetween(
                    moment(examInfo.classStartTimes.timeRangeStart, 'HH:mm'),
                    moment(examInfo.classStartTimes.timeRangeEnd, 'HH:mm'),
                    null,
                    '[]'
                );
        });
    }

    const eventData = {
        summary: 'FINAL EXAM: ' + classObj.className + " - " + classObj.componentName,
        description: "Instructor: " + classObj.instructor + "\n" +
            "Section: " + classObj.section + "\n" +
            "Class Number: " + classObj.classNumber,
        location: classObj.room,
        start: {
            dateTime: examInfo.examStartDateTime,
            timeZone: 'UTC'
        },
        end: {
            dateTime: examInfo.examEndDateTime,
            timeZone: 'UTC'
        }
    };

    console.log('Final exam eventData:');
    console.log(eventData);

    makeRequest('POST',
        '/calendars/' + calendar.id + '/events',
        JSON.stringify(eventData),
        (response) => {
            console.log('created final exam event');
        });
}

// Creates the Calendar if it does not exist, calls callback with calendar
function ensureCalendar(callback) {
    // Check if calendar exists
    makeRequest('GET', '/users/me/calendarList', null, (response) => {
        response = JSON.parse(response);

        const calendar = response.items.find((calendar) => calendar.summary == CALENDAR_NAME);
        if (calendar)
            callback(calendar);
        else
            createCalendar(callback);
    });
}

// Calls callback with created calendar
function createCalendar(callback) {
    const options = {
        summary: CALENDAR_NAME
    };

    console.log('Creating Calendar.');
    makeRequest('POST', '/calendars', JSON.stringify(options), (response) => {
        console.log('Calendar created.');
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

function getFinalExamGroupName(classObj, finalExamData) {
    if (
        moment(classObj.startTime, 'HH:mm')
        .isSameOrAfter(moment(finalExamData.lateClassesStartTime, 'HH:mm'))
    )
        return 'lateClasses';
    else if (finalExamData.groupIPattern.find((pattern) => isPatternMatching(pattern, classObj.days)))
        return 'groupI';
    else
        return 'groupII';
}

// Returns true if days matches the given pattern, false if not.
// See final_exam_data\scraper for more info.
function isPatternMatching(pattern, days) {
    return !(
        Object
        .keys(pattern)
        .some((day) => pattern[day] != days[day])
    );
}