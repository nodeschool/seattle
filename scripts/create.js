const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

require('dotenv').config();
const request = require('request');
const inquirer = require('inquirer');
const slug = require('slug');
const Mustache = require('mustache');
const moment = require('moment');
const _ = require('lodash');
const async = require('async');
const ora = require('ora');
const chalk = require('chalk');
const Nightmare = require('nightmare');
const meetup = require('meetup-api')({
  key: process.env.NODESCHOOL_SEA_MEETUP_API_KEY
});

slug.defaults.mode = 'rfc3986';

const {
  NODESCHOOL_SEA_GITHUB_API_USER,
  NODESCHOOL_SEA_GITHUB_API_TOKEN,
  NODESCHOOL_SEA_GOOGLE_MAPS_API_KEY,
  NODESCHOOL_SEA_MEETUP_API_KEY
} = process.env;

const NODESCHOOL_SEA_DEFAULT_EVENT_LOCATION = '';
const NODESCHOOL_SEA_DEFAULT_EVENT_COORDS = {
  lat: 47.606209,
  lng: -122.332071
};
// test calendar form url https://docs.google.com/forms/d/e/1FAIpQLSe2SK5Vzy82yB9SjLI5B3zfrR1QEaxyjyRGvVxWp_K66p31ZA/viewform
// const NODESCHOOL_CALENDAR_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSe2SK5Vzy82yB9SjLI5B3zfrR1QEaxyjyRGvVxWp_K66p31ZA/viewform';
// live calendar form url https://docs.google.com/forms/d/e/1FAIpQLSfp2GU7mntDJtLGwSu84gd6EztBMwQuqXImtrCgjzjbJNKf2Q/viewform
const NODESCHOOL_CALENDAR_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfp2GU7mntDJtLGwSu84gd6EztBMwQuqXImtrCgjzjbJNKf2Q/viewform';
const NODESCHOOL_CHAPTER_NAME = 'NodeSchool Seattle';
const NODESCHOOL_CHAPTER_LOCATION = 'Seattle, Washington';
const NODESCHOOL_CHAPTER_URL = 'https://nodeschool.io/seattle';

const MEETUP_URL = 'https://api.meetup.com';
const MEETUP_URLNAME = 'Seattle-NodeSchool';
const MEETUP_GROUP_ID = '18179633';

const GITHUB_URL = 'https://api.github.com';
const GITHUB_HEADERS = {
  Authorization: `token ${NODESCHOOL_SEA_GITHUB_API_TOKEN}`,
  'User-Agent': NODESCHOOL_SEA_GITHUB_API_USER
};
const GITHUB_ORG = 'nodeschool';
const GITHUB_REPO = 'seattle';
const GOOGLE_MAPS_API_URL = 'https://maps.googleapis.com/maps/api';
const SUCCESS_SYMBOL = chalk.green('✔');
const FAILURE_SYMBOL = chalk.red('✘');

const mentorIssueTemplate = fs.readFileSync(
  `${__dirname}/templates/mentor-registration-issue.mustache`,
  'utf8'
);
const meetupTemplate = fs.readFileSync(
  `${__dirname}/templates/meetup-event.mustache`,
  'utf8'
);

// running 'npm' with spawn does not work on windows; should really only matter in dev environments
const NPM_CMD = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
const timeRegex = new RegExp('^\\d{1,2}\\:\\d{2}(AM|PM)$', 'i');
const dateRegex = new RegExp('^\\d{4}-\\d{1,2}-\\d{1,2}$');

const eventNameQuestion = {
  type: 'input',
  name: 'eventName',
  message: 'What is the name of the event?',
  default: NODESCHOOL_CHAPTER_NAME,
  validate: function (input) {
    if (input.length <= 0) {
      return 'You must input a name for the event!';
    }
    return true;
  }
};

const eventLocationNameQuestion = {
  type: 'input',
  name: 'eventLocationName',
  message: 'What is the name of the location of the event?',
  validate: function (input) {
    if (!input) {
      return 'You must input a location name for the event!';
    }
    return true;
  }
};

const eventLocationQuestion = {
  type: 'input',
  name: 'eventLocation',
  message: 'Where will the event be located?',
  default: NODESCHOOL_SEA_DEFAULT_EVENT_LOCATION,
  validate: function (input) {
    if (!input) {
      return 'You must input a location for the event!';
    }
    return true;
  }
};

const eventDateQuestion = {
  type: 'input',
  name: 'eventDate',
  message: 'What date will the event be on? (YYYY-MM-DD)',
  validate: function (input) {
    if (!input) {
      return 'You must input a date for the event!';
    }
    if (!dateRegex.test(input)) {
      return 'You must input a valid date for the event! (YYYY-MM-DD)';
    }
    return true;
  }
};

const eventTimeStartQuestion = {
  type: 'input',
  name: 'eventTimeStart',
  message: 'What time will the event start?',
  default: '1:00PM',
  validate: function (input) {
    if (!input) {
      return 'You must input a time for the event to start!';
    }
    if (!timeRegex.test(input)) {
      return 'You must input a time in the proper format! (ex. 12:00PM)';
    }
    return true;
  }
};

const eventTimeIntroQuestion = {
  type: 'input',
  name: 'eventTimeIntro',
  message: 'What time will the introductions be?',
  default: '1:15PM',
  validate: function (input) {
    if (!input) {
      return 'You must input a time for the introductions and announcements!';
    }
    if (!timeRegex.test(input)) {
      return 'You must input a time in the proper format! (ex. 12:00PM)';
    }
    return true;
  }
};

const eventTimeFoodQuestion = {
  type: 'input',
  name: 'eventTimeFood',
  message: 'What time will the food be available?',
  default: '3:00PM',
  validate: function (input) {
    if (!input) {
      return 'You must input a time for food!';
    }
    if (!timeRegex.test(input)) {
      return 'You must input a time in the proper format! (ex. 12:00PM)';
    }
    return true;
  }
};

const eventTimeLearningStartQuestion = {
  type: 'input',
  name: 'eventTimeLearningStart',
  message: 'What time will learning/mentoring start?',
  default: '1:40PM',
  validate: function (input) {
    if (!input) {
      return 'You must input a time for learning/mentoring to start!';
    }
    if (!timeRegex.test(input)) {
      return 'You must input a time in the proper format! (ex. 12:00PM)';
    }
    return true;
  }
};

const eventTimeLearningEndQuestion = {
  type: 'input',
  name: 'eventTimeLearningEnd',
  message: 'What time will learning/mentoring end?',
  default: '5:00PM',
  validate: function (input) {
    if (!input) {
      return 'You must input a time for learning/mentoring to end!';
    }
    if (!timeRegex.test(input)) {
      return 'You must input a time in the proper format! (ex. 12:00PM)';
    }
    return true;
  }
};

const eventTimeEndQuestion = {
  type: 'input',
  name: 'eventTimeEnd',
  message: 'What time will the event end?',
  default: '5:00PM',
  validate: function (input) {
    if (!input) {
      return 'You must input a time for the event to end!';
    }
    if (!timeRegex.test(input)) {
      return 'You must input a time in the proper format! (ex. 12:00PM)';
    }
    return true;
  }
};

function inquire(callback) {
  inquirer
    .prompt([
      eventNameQuestion,
      eventLocationNameQuestion,
      eventLocationQuestion,
      eventDateQuestion,
      eventTimeStartQuestion,
      eventTimeIntroQuestion,
      eventTimeLearningStartQuestion,
      eventTimeLearningEndQuestion,
      eventTimeFoodQuestion,
      eventTimeEndQuestion
    ])
    .then(function (answers) {
      callback(null, answers);
    });
}

function createMentorIssue(data, callback) {
  const progressIndicator = ora(
    'Creating Mentor Registration GitHub Issue'
  ).start();
  const {
    eventName,
    eventLocationName,
    eventDate,
    eventTimeStart,
    eventTimeEnd,
    meetupEventURL
  } = data;

  const startDateTime = moment(`${eventDate} ${eventTimeStart}`, 'YYYY-MM-DD hh:mma');

  const mentorArriveTime = startDateTime
    .subtract(30, 'minutes')
    .format('hh:mmA');

  const mentorIssueBody = Mustache.render(mentorIssueTemplate, {
    locationName: eventLocationName,
    date: startDateTime.format('MMMM Do'),
    time: `${eventTimeStart}-${eventTimeEnd}`,
    meetupURL: meetupEventURL,
    mentorArriveTime
  });

  request.post(
    {
      url: `${GITHUB_URL}/repos/${GITHUB_ORG}/${GITHUB_REPO}/issues`,
      headers: GITHUB_HEADERS,
      json: true,
      body: {
        title: `Mentor Registration for ${startDateTime.format('MMMM Do, YYYY')}`,
        body: mentorIssueBody
      }
    },
    function (error, response, body) {
      if (error) {
        progressIndicator.stopAndPersist(FAILURE_SYMBOL);
        callback(error);
        return;
      }

      progressIndicator.stopAndPersist(SUCCESS_SYMBOL);
      const { html_url: mentorRegistrationUrl } = body;
      const updatedData = _.assign(data, {
        mentorRegistrationUrl,
        mentorArriveTime
      });
      callback(null, updatedData);
    }
  );
}

function getDuration(date, startTime, endTime) {
  let start = moment(`${date} ${startTime}`, 'YYYY-MM-DD hh:mmA').valueOf();
  let end = moment(`${date} ${endTime}`, 'YYYY-MM-DD hh:mmA').valueOf();
  return end - start;
}

function createMeetupEvent(data, callback) {
  const progressIndicator = ora('Creating Meetup.com Event').start();
  const {
    eventName,
    eventLocationName,
    eventDate,
    eventTimeStart,
    eventMeetupURL,
    eventTimeEnd
  } = data;

  const parameters = {
    group_id: MEETUP_GROUP_ID,
    group_urlname: MEETUP_URLNAME,
    name: eventName,
    time: moment(
      `${eventDate} ${eventTimeStart}`,
      'YYYY-MM-DD hh:mmA'
    ).valueOf(),
    duration: getDuration(eventDate, eventTimeStart, eventTimeEnd)
  };

  meetup.postEvent(parameters, function (err, resp) {
    if (err) {
      progressIndicator.stopAndPersist(FAILURE_SYMBOL);
      callback(err);
      return;
    }
    progressIndicator.stopAndPersist(SUCCESS_SYMBOL);
    const updatedData = _.assign(data, {
      meetupEventURL: resp.event_url,
      meetupGroupID: resp.group.id,
      meetupEventID: resp.id
    });
    callback(null, updatedData);
  });
}

// need to update the event after creating the github issue, so we can reference that url
// on the meetup event
function updateMeetupEvent(data, callback) {
  const progressIndicator = ora('Updating Meetup.com Event').start();
  const {
    eventName,
    eventLocationName,
    eventLocation,
    eventDate,
    eventTimeStart,
    eventTimeIntro,
    eventTimeEnd,
    eventTimeLearningStart,
    eventTimeLearningEnd,
    eventTimeFood,
    eventMeetupURL,
    mentorRegistrationUrl,
    meetupEventID,
    eventLocationCoordinates,
    mentorArriveTime
  } = data;

  const meetupEventBody = Mustache.render(meetupTemplate, {
    eventTimeStart,
    eventTimeIntro,
    eventTimeLearningStart,
    eventTimeLearningEnd,
    eventTimeFood,
    eventTimeEnd,
    mentorArriveTime,
    mentorRegistrationUrl,
    meetupEventID,
    eventLocationCoordinates,
    eventLocation,
    eventLocationName
  });

  const parameters = {
    description: meetupEventBody,
    id: meetupEventID,
    // doesn't seem that this is doing anything?
    lat: parseInt(eventLocationCoordinates.lat, 10),
    lon: parseInt(eventLocationCoordinates.lng, 10),
  };

  meetup.editEvent(parameters, function (err, resp) {
    if (err) {
      progressIndicator.stopAndPersist(FAILURE_SYMBOL);
      callback(err);
      return;
    }
    progressIndicator.stopAndPersist(SUCCESS_SYMBOL);
    callback(null, data);
  });
}

function getEventLocationLatLng(data, callback) {
  const progressIndicator = ora(
    'Getting event location latitude and longitude'
  ).start();
  const { eventLocation } = data;

  request.get(
    {
      url: `${GOOGLE_MAPS_API_URL}/geocode/json`,
      json: true,
      qs: {
        address: eventLocation,
        key: NODESCHOOL_SEA_GOOGLE_MAPS_API_KEY
      }
    },
    function (error, response, body) {
      if (error) {
        console.log('geocoding error', error);
        progressIndicator.stopAndPersist(FAILURE_SYMBOL);
        callback(error);
        return;
      }
      progressIndicator.stopAndPersist(SUCCESS_SYMBOL);
      const eventLocationCoordinates =
        _.get(body, 'results[0].geometry.location') ||
        NODESCHOOL_SEA_DEFAULT_EVENT_COORDS;
      const updatedData = _.assign(data, {
        eventLocationCoordinates
      });
      callback(null, updatedData);
    }
  );
}

function addEventToNodeSchoolCalendar(data, callback) {
  const progressIndicator = ora('Adding event to NodeSchool calendar').start();
  const { eventLocationCoordinates, eventDate } = data;
  const nightmare = Nightmare({
    show: true,
    webPreferences: {
      preload: `${__dirname}/config/custom_nightmare_preload.js`
    }
  });

  nightmare
    .goto(NODESCHOOL_CALENDAR_FORM_URL)
    .type('input[aria-label="Name"]', NODESCHOOL_CHAPTER_NAME)
    .type('input[aria-label="Location"]', NODESCHOOL_CHAPTER_LOCATION)
    .type('input[aria-label="Latitude"]', eventLocationCoordinates.lat)
    .type('input[aria-label="Longitude"]', eventLocationCoordinates.lng)
    .type(
    '*[aria-label="Start Date"] input',
    moment(eventDate).format('MMDDYYYY')
    )
    .type('input[aria-label="Website"]', NODESCHOOL_CHAPTER_URL)
    .evaluate(function () {
      document.querySelector('form').submit();
    })
    .wait('.freebirdFormviewerViewResponseLinksContainer')
    .evaluate(function () {
      const xpathQuery = document.evaluate(
        "//a[contains(., 'Edit your response')]",
        document
      );
      const editUrl = xpathQuery.iterateNext().href;
      return editUrl;
    })
    .end()
    .then(function (editLink) {
      progressIndicator.stopAndPersist(SUCCESS_SYMBOL);
      console.log('Google Forms edit link:', editLink);
      callback(null, data);
    })
    .catch(function (error) {
      progressIndicator.stopAndPersist(FAILURE_SYMBOL);
      callback(error);
    });
}

function generateWebsite(data, callback) {
  const progressIndicator = ora('Generating website').start();
  const {
    eventDate,
    eventTimeStart,
    eventTimeEnd,
    eventLocationName,
    eventLocation,
    eventRegistrationUrl,
    mentorRegistrationUrl
  } = data;
  const siteData = {
    generatedAt: Date.now(),
    nextEvent: {
      dayOfTheWeek: moment(eventDate).format('dddd'),
      date: moment(eventDate).format('MMMM Do'),
      time: `${eventTimeStart}-${eventTimeEnd}`,
      address: `${eventLocationName} ${eventLocation}`,
      addressUrlSafe: encodeURIComponent(eventLocation),
      mentorsUrl: mentorRegistrationUrl,
      ticketsUrl: eventRegistrationUrl
    }
  };
  const dataJsonString = JSON.stringify(siteData, null, 2);

  fs.writeFileSync(`${__dirname}/../docs-src/data.json`, dataJsonString, {
    encoding: 'UTF8'
  });

  const docsBuild = spawn(NPM_CMD, ['run', 'docs:build'], {
    stdio: 'inherit'
  });
  docsBuild.on('error', function (error) {
    progressIndicator.stopAndPersist(FAILURE_SYMBOL);
    callback(error);
  });
  docsBuild.on('close', function () {
    progressIndicator.stopAndPersist(SUCCESS_SYMBOL);
    callback(null, data);
  });
}

function publishWebsite(data, callback) {
  const progressIndicator = ora('Publishing website').start();
  const docsPublish = spawn(NPM_CMD, ['run', 'docs:publish'], {
    stdio: 'inherit'
  });

  docsPublish.on('error', function (error) {
    progressIndicator.stopAndPersist(FAILURE_SYMBOL);
    callback(error);
  });
  docsPublish.on('close', function () {
    progressIndicator.stopAndPersist(SUCCESS_SYMBOL);
    callback(null, data);
  });
}

async.waterfall(
  [
    inquire,
    getEventLocationLatLng,
    createMeetupEvent,
    createMentorIssue,
    updateMeetupEvent,
    // addEventToNodeSchoolCalendar,
    generateWebsite,
    publishWebsite
  ],
  function (error, result) {
    if (error) {
      console.log(
        chalk.red('There was an error creating the event ☹️'),
        '\n',
        error
      );
    } else {
      console.log(chalk.green('Event created successfully! 😃'));
    }
  }
);
