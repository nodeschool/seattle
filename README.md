# NodeSchool Seattle

[![Join the chat at https://gitter.im/nodeschool/seattle](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/nodeschool/seattle?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Welcome to the NodeSchool Seattle chapter's repository. We use this
repository for our website and almost all our communication.

You can see the website and learn more about the Seattle chapter at: http://nodeschool.io/seattle/

## Talk to us

We utilize [GitHub Issues](https://github.com/nodeschool/seattle/issues)
like a message board and keep almost all of our communication in the open. If
for any reason you need to contact an organizer privately you may contact us
directly.

## Owner

 - Wil Alvarez, [@satanas82](https://twitter.com/satanas82)

## Contributing to the website

The website is generated using Mustache templates, Stylus, and JavaScript. It runs on [GitHub Pages](https://pages.github.com/).

#### Running locally

1. Fork the repository
2. Clone your fork to a local folder: `git clone <fork url here>`
3. `cd` into your project folder.
4. Run `npm install` to install dependencies.

For a development server, run

```bash
$ npm run docs:dev
```

Now you can visit `http://localhost:8080/` in your browser to see the website. 

**Important**: edit files inside the directory `docs-src`. Files are compiled into the `docs` folder. Changes will be
compiled automatically by the `npm run docs:dev` command.

## Preparing for a workshop

### Install node.js

Install node using the installer for your operating system found here: http://nodejs.org/download/

### Install javascripting and learnyounode

Install these two nodeschool workshops via the command-line:

```
npm install -g javascripting learnyounode
```

Check to make sure they are installed correctly. You should be able to run `javascripting` or `learnyounode` on the
command-line and see a menu pop up that looks similar to this:

![javascripting](https://github.com/sethvincent/javascripting/raw/master/screenshot.png)

Check out other tutorials like these at http://nodeschool.io

Install any that you might want to work on.

### Issues & troubleshooting

Having issues with installation? Let us know by opening an issue here: https://github.com/nodeschool/seattle/issues
Make sure to describe your problem in detail, including your operating system, what you used to install node, etc.

### Choose a text editor

If you've already got a text editor you like, then this is complete!

[Sublime](http://www.sublimetext.com/), [atom](http://atom.io), & [brackets](http://brackets.io/) are all good choices.

### Command-line basics

We'll be working through interactive tutorials that are completed on the command-line.

[Here](https://github.com/sethvincent/dev-envs-book/blob/master/chapters/04-terminal.md#basic-commands) are some basic
commands that would be useful to learn about before the workshop.

We'll be demoing how to complete the tutorials in the beginning of the workshop and will be available to help if there are any issues.
