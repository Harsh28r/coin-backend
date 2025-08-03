
const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  url: [String],
  title: [String],
  link: [String],
  width: [String],
  height: [String]
});

const ChannelSchema = new mongoose.Schema({
  title: [String],
  atomLink: [{
    href: String,
    rel: String,
    type: String
  }],
  link: [String],
  description: [String],
  lastBuildDate: [String],
  language: [String],
  updatePeriod: [String],
  updateFrequency: [String],
  generator: [String],
  image: ImageSchema
});

const RssFeedSchema = new mongoose.Schema({
  channel: [ChannelSchema]
});

const RssFeed = mongoose.model('RssFeed', RssFeedSchema);

module.exports = RssFeed;