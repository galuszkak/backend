import axios from 'axios';
import config from "../config";
import {obtainHrefToReplace} from "./hrefRepleacer";
import moment = require("moment");

const { Storage } = require('@google-cloud/storage');

class AdviceItem {
    constructor(title: string, replies: Array<string>) {
        this.title = title;
        this.replies = replies;
    }

    title: string;
    replies: Array<string>;
}

class Advice {
    constructor(watermark: string, advices: Array<AdviceItem>) {
        this.watermark = watermark;
        this.advices = advices;
    }

    advices: Array<AdviceItem>;
    watermark: string;
}

const adviceItems: Array<AdviceItem> = [];

const verifyContent = () => {
    if (adviceItems.length === 0) {
        throw new Error("elements size can not be 0");
    }

    adviceItems.forEach(value => {
        const title = value.title;
        const replies = value.replies;
        if (title === '') {
            throw new Error("title can not be empty");
        }
        if (replies.length === 0) {
            throw new Error("replies can not be empty");
        }
    })
}

export const advicesParser = async () => {

    const source = 'https://www.gov.pl/web/koronawirus/porady';
    const { JSDOM } = require('jsdom');

    try {
        const response = await axios.get(source);

        const { data, status } = response;

        if (status !== 200) {
            throw new Error('Can not fetch html');
        }

        const dom = new JSDOM(data);

        dom.window.document
            .querySelector('.editor-content:last-child > div')
            .querySelectorAll(':scope > details')
            .forEach((detailsElement: Element) => {
                const replies: Array<string> = [];
                const title = detailsElement.querySelector('summary')!.textContent;
                if (detailsElement.querySelector('p') !== null) {
                    const answerSelector = detailsElement.querySelector('p')!;
                    const { text, toReplace } = obtainHrefToReplace(answerSelector);
                    let answer = answerSelector.textContent!;
                    answer = answer.replace(text, toReplace!);
                    replies.push(answer);
                } else if (detailsElement.querySelector('ul') !== null) {
                    detailsElement
                        .querySelector('ul')!
                        .querySelectorAll(':scope > li')
                        .forEach(liElement => {
                            replies.push(liElement.textContent!);
                        });
                }
                const adviceItem = new AdviceItem(title!, replies)
                adviceItems.push(adviceItem);
            });

        verifyContent()

        const watermark = `${moment().format('YYYY-MM-D')} - ${source}`;
        const advice = new Advice(watermark, adviceItems);

        const storage = new Storage();
        const bucket = storage.bucket(config.buckets.cdn);

        const file = bucket.file('advices.json');
        await file.save(JSON.stringify(advice));

    } catch (exception) {
        throw new Error(exception);
    }
};

export default advicesParser;
