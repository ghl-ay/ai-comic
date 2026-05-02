// This file is created by egg-ts-helper@2.1.1
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportAiConfig = require('../../../app/controller/aiConfig');
import ExportAuth = require('../../../app/controller/auth');
import ExportChapter = require('../../../app/controller/chapter');
import ExportCharacter = require('../../../app/controller/character');
import ExportComic = require('../../../app/controller/comic');

declare module 'egg' {
  interface IController {
    aiConfig: ExportAiConfig;
    auth: ExportAuth;
    chapter: ExportChapter;
    character: ExportCharacter;
    comic: ExportComic;
  }
}
