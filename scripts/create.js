const fs = require('fs');
const { spawn } = require('child_process');

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

slug.defaults.mode = 'rfc3986';

const {
  NODESCHOOL_SEA_GITHUB_API_USER,
  NODESCHOOL_SEA_GITHUB_API_TOKEN,
  NODESCHOOL_SEA_GOOGLE_MAPS_API_KEY,
  NODESCHOOL_SEA_MEETUP_API_KEY
} = process.env;

const NODESCHOOL_SEA_DEFAULT_EVENT_LOCATION = '';
const NODESCHOOL_SEA_DEFAULT_EVENT_COORDS = {
  lat: 37.8077447,
  lng: -122.2653488
};
// test calendar form url https://docs.google.com/forms/d/e/1FAIpQLSe2SK5Vzy82yB9SjLI5B3zfrR1QEaxyjyRGvVxWp_K66p31ZA/viewform
const NODESCHOOL_CALENDAR_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSe2SK5Vzy82yB9SjLI5B3zfrR1QEaxyjyRGvVxWp_K66p31ZA/viewform';
// live calendar form url https://docs.google.com/forms/d/e/1FAIpQLSfp2GU7mntDJtLGwSu84gd6EztBMwQuqXImtrCgjzjbJNKf2Q/viewform
// const NODESCHOOL_CALENDAR_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfp2GU7mntDJtLGwSu84gd6EztBMwQuqXImtrCgjzjbJNKf2Q/viewform';
const NODESCHOOL_CHAPTER_NAME = 'NodeSchool Seattle';
const NODESCHOOL_CHAPTER_LOCATION = 'Seattle, Washington';
const NODESCHOOL_CHAPTER_URL = 'https://nodeschool.io/seattle';

const MEETUP_URL = 'https://api.meetup.com';
const MEETUP_URLNAME = 'Meetup-API-Testing';
const MEETUP_HEADERS = {};

const GITHUB_URL = 'https://api.github.com';
const GITHUB_HEADERS = {
  Authorization: `token ${NODESCHOOL_SEA_GITHUB_API_TOKEN}`,
  'User-Agent': NODESCHOOL_SEA_GITHUB_API_USER
};
const GITHUB_ORG = 'e-e';
const GITHUB_REPO = 'test';
const GOOGLE_MAPS_API_URL = 'https://maps.googleapis.com/maps/api';
const SUCCESS_SYMBOL = chalk.green('✔');
const FAILURE_SYMBOL = chalk.red('✘');

const mentorIssueTemplate = fs.readFileSync(
  `${__dirname}/templates/mentor-registration-issue.mustache`,
  'utf8'
);

const eventNameQuestion = {
  type: 'input',
  name: 'eventName',
  message: 'What is the name of the event?',
  validate: function(input) {
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
  default: 'npm',
  validate: function(input) {
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
  validate: function(input) {
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
  validate: function(input) {
    if (!input) {
      return 'You must input a date for the event!';
    }
    const eventDateMoment = moment(input);
    if (!eventDateMoment.isValid()) {
      return 'You must input a valid date for the event!';
    }
    return true;
  }
};

const eventTimeQuestion = {
  type: 'input',
  name: 'eventTime',
  message: 'What time will the event be?',
  default: '1-5PM',
  validate: function(input) {
    if (!input) {
      return 'You must input a time for the event!';
    }
    return true;
  }
};

const eventMentorTimeQuestion = {
  type: 'input',
  name: 'eventMentorTime',
  message: 'What time should mentors show up?',
  default: '12:30PM',
  validate: function(input) {
    if (!input) {
      return 'You must input a time for the for mentors to arrive!';
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
      eventTimeQuestion,
      eventMentorTimeQuestion
    ])
    .then(function(answers) {
      callback(null, answers);
    });
}

function createMeetupEvent(data, callback) {
  const {
    eventName,
    eventLocationName,
    eventDate,
    eventTime,
    eventMeetupURL
  } = data;

  request.post(
    {
      url: `${MEETUP_URL}/${MEETUP_URLNAME}/events`,
      headers: GITHUB_HEADERS,
      json: true,
      body: {
        title: `Mentor Registration: ${eventName} at ${eventLocationName}`,
        body: mentorIssueBody
      }
    },
    function(error, response, body) {
      if (error) {
        progressIndicator.stopAndPersist(FAILURE_SYMBOL);
        callback(error);
        return;
      }

      progressIndicator.stopAndPersist(SUCCESS_SYMBOL);
      const { html_url: mentorRegistrationUrl } = body;
      const updatedData = _.assign(data, {
        mentorRegistrationUrl
      });
      callback(null, updatedData);
    }
  );

  const updatedData = _.assign(data, {
    eventMeetupURL: 'https://meetup.com/test-url'
  });
  callback(null, updatedData);
}

function createMentorIssue(data, callback) {
  const progressIndicator = ora(
    'Creating Mentor Registration GitHub Issue'
  ).start();
  const {
    eventName,
    eventLocationName,
    eventDate,
    eventTime,
    eventMeetupURL
  } = data;

  const mentorIssueBody = Mustache.render(mentorIssueTemplate, {
    locationName: eventLocationName,
    date: moment(eventDate).format('MMMM Do'),
    time: eventTime,
    meetupURL: eventMeetupURL
  });

  request.post(
    {
      url: `${GITHUB_URL}/repos/${GITHUB_ORG}/${GITHUB_REPO}/issues`,
      headers: GITHUB_HEADERS,
      json: true,
      body: {
        title: `Mentor Registration: ${eventName} at ${eventLocationName}`,
        body: mentorIssueBody
      }
    },
    function(error, response, body) {
      if (error) {
        progressIndicator.stopAndPersist(FAILURE_SYMBOL);
        callback(error);
        return;
      }

      progressIndicator.stopAndPersist(SUCCESS_SYMBOL);
      const { html_url: mentorRegistrationUrl } = body;
      const updatedData = _.assign(data, {
        mentorRegistrationUrl
      });
      callback(null, updatedData);
    }
  );
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
    function(error, response, body) {
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
    .evaluate(function() {
      document.querySelector('form').submit();
    })
    .wait('.freebirdFormviewerViewResponseLinksContainer')
    .evaluate(function() {
      const xpathQuery = document.evaluate(
        "//a[contains(., 'Edit your response')]",
        document
      );
      const editUrl = xpathQuery.iterateNext().href;
      return editUrl;
    })
    .end()
    .then(function(editLink) {
      progressIndicator.stopAndPersist(SUCCESS_SYMBOL);
      console.log('Google Forms edit link:', editLink);
      callback(null, data);
    })
    .catch(function(error) {
      progressIndicator.stopAndPersist(FAILURE_SYMBOL);
      callback(error);
    });
}

function generateWebsite(data, callback) {
  const progressIndicator = ora('Generating website').start();
  const {
    eventDate,
    eventTime,
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
      time: eventTime,
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

  const docsBuild = spawn('npm', ['run', 'docs:build'], { stdio: 'inherit' });
  docsBuild.on('error', function(error) {
    progressIndicator.stopAndPersist(FAILURE_SYMBOL);
    callback(error);
  });
  docsBuild.on('close', function() {
    progressIndicator.stopAndPersist(SUCCESS_SYMBOL);
    callback(null, data);
  });
}

function generateSocialImage(data, callback) {
  const progressIndicator = ora('Generating social image').start();
  const generateSocial = spawn('npm', ['run', 'docs:generate-social'], {
    stdio: 'inherit'
  });

  generateSocial.on('error', function(error) {
    progressIndicator.stopAndPersist(FAILURE_SYMBOL);
    callback(error);
  });
  generateSocial.on('close', function() {
    progressIndicator.stopAndPersist(SUCCESS_SYMBOL);
    callback(null, data);
  });
}

function publishWebsite(data, callback) {
  const progressIndicator = ora('Publishing website').start();
  const docsPublish = spawn('npm', ['run', 'docs:publish'], {
    stdio: 'inherit'
  });

  docsPublish.on('error', function(error) {
    progressIndicator.stopAndPersist(FAILURE_SYMBOL);
    callback(error);
  });
  docsPublish.on('close', function() {
    progressIndicator.stopAndPersist(SUCCESS_SYMBOL);
    callback(null, data);
  });
}

async.waterfall(
  [
    inquire,
    createMeetupEvent,
    createMentorIssue
    // getEventLocationLatLng,
    // addEventToNodeSchoolCalendar,
    // generateWebsite,
    // publishWebsite
  ],
  function(error, result) {
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
