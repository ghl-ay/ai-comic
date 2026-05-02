// This file is created by egg-ts-helper@2.1.1
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
type AnyClass = new (...args: any[]) => any;
type AnyFunc<T = any> = (...args: any[]) => T;
type CanExportFunc = AnyFunc<Promise<any>> | AnyFunc<IterableIterator<any>>;
type AutoInstanceType<T, U = T extends CanExportFunc ? T : T extends AnyFunc ? ReturnType<T> : T> = U extends AnyClass ? InstanceType<U> : U;
import ExportAiImage = require('../../../app/service/ai-image');
import ExportAiText = require('../../../app/service/ai-text');
import ExportAiConfig = require('../../../app/service/aiConfig');
import ExportAuth = require('../../../app/service/auth');
import ExportChapter = require('../../../app/service/chapter');
import ExportCharacter = require('../../../app/service/character');
import ExportComic = require('../../../app/service/comic');
import ExportDb = require('../../../app/service/db');

declare module 'egg' {
  interface IService {
    aiImage: AutoInstanceType<typeof ExportAiImage>;
    aiText: AutoInstanceType<typeof ExportAiText>;
    aiConfig: AutoInstanceType<typeof ExportAiConfig>;
    auth: AutoInstanceType<typeof ExportAuth>;
    chapter: AutoInstanceType<typeof ExportChapter>;
    character: AutoInstanceType<typeof ExportCharacter>;
    comic: AutoInstanceType<typeof ExportComic>;
    db: AutoInstanceType<typeof ExportDb>;
  }
}
