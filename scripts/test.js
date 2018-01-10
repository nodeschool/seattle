const meetup = require('meetup-api')({
  key: '701e127f58191d3e972154e2e2d3c5'
});
// const groupid = '1556336';
// const parameters = {
//   urlname: 'Seattle-NodeSchool'
// };
// meetup.getGroup(parameters, function(err, resp) {
//   console.log(err, resp);
// });
const MEETUP_URL = 'https://api.meetup.com';
const MEETUP_URLNAME = 'Seattle-Computer-programming-Meetup-TEST';
const MEETUP_GROUP_ID = '27105767';

function createMeetupEvent(data, callback) {
  // const progressIndicator = ora('Creating Meetup.com Event').start();
  const {
    eventName,
    eventLocationName,
    eventDate,
    eventTime,
    eventMeetupURL
  } = data;

  const parameters = {
    group_id: MEETUP_GROUP_ID,
    group_urlname: MEETUP_URLNAME,
    name: eventName,
    simple_html_description: '',
    time: ''
  };

  meetup.postEvent(parameters, function(err, resp) {
    console.log(err, resp);
  });

  // const updatedData = _.assign(data, {
  //   eventMeetupURL: 'https://meetup.com/test-url'
  // });
  // callback(null, updatedData);
}

createMeetupEvent({ eventName: 'Test event name!!' }, function() {});

// meetup.getGroup({ urlname: MEETUP_URLNAME }, function(err, resp) {
//   console.log(err, resp);
// });
