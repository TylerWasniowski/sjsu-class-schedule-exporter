// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const CALENDAR_NAME = "SJSU Schedule";

const CALENDAR_API_BASE_URL = 'https://www.googleapis.com/calendar/v3';
const FINAL_EXAM_DATA_BASE_URL = 'https://raw.githubusercontent.com/TylerWasniowski/sjsu-class-schedule-exporter/master/final_exam_data/';


// Message sent with classes object upon button click
chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        if (request.schedule && request.schedule.classes.length > 0) {
            exportSchedule(request.schedule);
            sendResponse('schedule_received');
        } else if (request.schedule && request.schedule.classes.length == 0)
            sendResponse('classes_empty');
        else
            sendResponse('no_schedule');
    });

function exportSchedule(schedule) {
    const classEventPromises = [];
    const finalExamEventPromises = [];

    ensureCalendar()
        .then((calendar) => {
            schedule.classes.forEach((classObj) => {
                classEventPromises.push(createClassEvent(calendar, classObj));
            });

            Promise.all(classEventPromises)
                .then(() => alert("All class events created successfully. They will appear in your Google Calendar."));

            // Get final exam data for given semester, then create final exam events
            getFinalExamData(schedule.semester)
                .then((finalExamData) => {
                    schedule.classes.forEach((classObj) => {
                        finalExamEventPromises.push(createFinalExamEvent(calendar, classObj, finalExamData));
                    });
                    Promise.all(finalExamEventPromises)
                        .then(() => alert("All final exam events created successfully. They will appear in your Google Calendar."));
                });
            
            
        });
}

function createClassEvent(calendar, classObj) {
    console.log('Create class event function');
    console.log('Class:');
    console.log(classObj);

    const startDateObj = moment(classObj.startDate, 'MM-DD-YYYY');
    const endDate = moment(classObj.endDate, 'MM-DD-YYYY');

    const firstDateObj = getFirstDate(startDateObj, classObj.days);
    const startTime = moment.tz(firstDateObj.format('MM-DD-YYYY') + ' ' + classObj.startTime,
            'MM-DD-YYYY HH:mm', 'America/Los_Angeles')
        .format();
    const endTime = moment.tz(firstDateObj.format('MM-DD-YYYY') + ' ' + classObj.endTime,
            'MM-DD-YYYY HH:mm', 'America/Los_Angeles')
        .format();

    const eventData = {
        summary: classObj.className + " - " + classObj.componentName,
        description: "Instructor: " + classObj.instructor + "\n" +
            "Section: " + classObj.section + "\n" +
            "Class Number: " + classObj.classNumber,
        location: classObj.room,
        start: {
            dateTime: startTime,
            timeZone: 'America/Los_Angeles'
        },
        end: {
            dateTime: endTime,
            timeZone: 'America/Los_Angeles'
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

    return makeRequest('POST',
            '/calendars/' + calendar.id + '/events',
            JSON.stringify(eventData))
        .then((response) => {
            console.log('Created class event:');
            console.log(response);
        });
}

function createFinalExamEvent(calendar, classObj, finalExamData) {
    console.log('Create final exam event function');
    console.log('Class:')
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

    return makeRequest('POST',
            '/calendars/' + calendar.id + '/events',
            JSON.stringify(eventData))
        .then((response) => {
            console.log('Created final exam event:');
            console.log(response);
        });
}

// Creates the Calendar if it does not exist
// returns a promise (containing the calendar if it resolves)
function ensureCalendar() {
    // Check if calendar exists
    return new Promise((resolve, reject) => {
        makeRequest('GET', '/users/me/calendarList', null)
            .then((response) => {
                const calendar = response.items.find((calendar) => calendar.summary == CALENDAR_NAME);
                if (calendar)
                    resolve(calendar);
                else
                    createCalendar().then(resolve, reject);
            });
    });
}

// Returns a promise (containing the calendar if it resolves)
function createCalendar() {
    const options = {
        summary: CALENDAR_NAME
    };

    console.log('Creating Calendar.');
    return makeRequest('POST', '/calendars', JSON.stringify(options))
        .then(
            (calendar) => {
                console.log('Calendar created.');
                return calendar;
            },
            (error) => {
                alert("Failed to create calendar. See background console for more info.");
                console.error(error);
            }
        );
}

// Makes Google Calendar API request, returns a promise
function makeRequest(method, uri, body) {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({
            interactive: true
        }, (token) => {
            if (chrome.runtime.lastError) {
                console.log(chrome.runtime.lastError.message);
                reject(chrome.runtime.lastError);
                return;
            }
            if (!token) {
                reject('Failed to aquire auth token');
                return;
            }

            let headers = new Headers();
            headers.append('Authorization', 'Bearer ' + token);
            headers.append('Content-Type', 'application/json');

            fetch(CALENDAR_API_BASE_URL + uri, { method, headers, body })
                .then(
                    (response) => response.json(),
                    (response) => {
                        alert("Failed to make Google Calendar API request. See background console for more info.");
                        console.error(response);
                        reject(response);
                    }
                )
                .then(resolve);
        });
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
        const newDay = startDate.days() + offset;
        if (daysArr[newDay % daysArr.length])
            return moment(startDate).days(newDay);
    }
}

// Returns a promise (containing the final exam data if it resolves)
function getFinalExamData(semester) {
    return fetch(FINAL_EXAM_DATA_BASE_URL + semester + '.json')
        .then(
            (response) => {
                try {
                    return response.json();
                } catch (error) {
                    alert("Failed to parse final data. See background console for more info.");
                    console.error(error);
                }
            },
            (response) => {
                alert("Failed to get final data. See background console for more info.");
                console.error(response);
            }
        )
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