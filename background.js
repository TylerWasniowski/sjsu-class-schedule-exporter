// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const HOST = "cmsweb.cms.sjsu.edu";

chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: {hostEquals: HOST},
      })
      ],
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

function createClassEvent(classs) {
  console.log('create event function');
  console.log(classs);
  // makeRequest('', );
}

function exportClasses(classes) {
  console.log(classes);
  createCalendar(() => {
    classes.forEach(createClassEvent);
  });
}

function createCalendar(callback) {
  makeRequest('', (response) => {
    alert(response);
    callback();
  });
}

function makeRequest(params, callback) {
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
    x.open('GET', 'https://www.googleapis.com/calendar/v3/users/me/calendarList');
    x.setRequestHeader('Authorization', 'Bearer ' + token);
    x.onload = () => {
      callback(x.response);
    };
    x.send();

    console.log('token sent');
  });
}