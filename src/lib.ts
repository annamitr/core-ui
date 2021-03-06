/* Data & Datatime utils*/
import "core-js/stable";
import "regenerator-runtime/runtime";
/* Text Mask */
import { DateTime } from "luxon";
// @ts-ignore
import maskInput from 'vanilla-text-mask';
import createNumberMask from 'text-mask-addons/dist/createNumberMask';
import emailMask from 'text-mask-addons/dist/emailMask';
/* --- */
import * as _underscore from 'underscore';

import * as mixin from './utils/underscore';
/* Core.Model utils */
import backbone from 'backbone';
import * as Marionette_ from 'backbone.marionette';
// @ts-ignore
import { OldCollectionView } from 'marionette.oldcollectionview';
// @ts-ignore
import AppRouter from 'marionette.approuter';
import 'backbone-computedfields';
import 'backbone.radio';
import 'backbone-associations';
/* --- */
import * as Handlebars_ from 'handlebars';
import jquery from 'jquery';
// @ts-ignore
import autosize from 'autosize';

import CodeMirror from 'codemirror';

import domapi from './utils/DOMApi';

(<any>window)._ = _underscore.mixin(mixin.default);
// @ts-ignore
Marionette_.AppRouter = AppRouter;
// @ts-ignore
Marionette_.PartialCollectionView = OldCollectionView.setDomApi(domapi);
// @ts-ignore
Marionette_.setDomApi(domapi);

(<any>window).Marionette = Marionette_;

const api = {
    DateTime: DateTime,
    Handlebars: Handlebars_,
    $: jquery,
    Backbone: backbone,
    codemirror: CodeMirror,
    autosize,
    maskInput,
    createNumberMask,
    emailMask
};

const dateTime = api.DateTime;
const $ = api.$;
const codemirror = api.codemirror;
const _ = (<any>window)._;

export default api;
export { _, dateTime, $, codemirror, autosize, createNumberMask, maskInput, emailMask };
