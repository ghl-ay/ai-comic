// server/app/ai/utils/reference.js
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * @typedef {{ type: 'path', path: string } | { type: 'url', url: string } | { type: 'base64', data: string, mimeType: string }} ImageReference
 */

function pathToDataUrl(filePath) {
  const imageBuffer = fs.readFileSync(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
}

/**
 * 将统一 references 转为 data URL / http URL 字符串列表（供 JSON body.image）
 * @param {ImageReference[]} references
 * @returns {string[]}
 */
function referencesToUrlList(references = []) {
  const urls = [];
  for (const reference of references) {
    if (!reference) continue;
    if (reference.type === 'path' && reference.path && fs.existsSync(reference.path)) {
      urls.push(pathToDataUrl(reference.path));
    } else if (reference.type === 'url' && reference.url) {
      urls.push(reference.url);
    } else if (reference.type === 'base64' && reference.data) {
      const mimeType = reference.mimeType || 'image/png';
      const data = reference.data.startsWith('data:')
        ? reference.data
        : `data:${mimeType};base64,${reference.data}`;
      urls.push(data);
    }
  }
  return urls;
}

/**
 * 仅提取本地路径（供 OpenAI images.edit multipart）
 * @param {ImageReference[]} references
 * @returns {string[]}
 */
function referencesToLocalPaths(references = []) {
  return references
    .filter(reference => reference && reference.type === 'path' && reference.path && fs.existsSync(reference.path))
    .map(reference => reference.path);
}

module.exports = {
  pathToDataUrl,
  referencesToUrlList,
  referencesToLocalPaths,
};
