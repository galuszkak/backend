import config, {generateCodeIPChecker, secretManager} from "../config";
import {CallableContext} from "firebase-functions/lib/providers/https";
import * as functions from "firebase-functions";
import moment = require("moment");

export async function generateCode(data : any, context: CallableContext) {
    if (!await generateCodeIPChecker.allow(<string>context.rawRequest.header('Cf-Connecting-Ip'))) {
        throw new functions.https.HttpsError('permission-denied', 'Permission denied.');
    }

    if (context.rawRequest.header('api-token') !== await secretManager.getConfig('apiToken')) {
        throw new functions.https.HttpsError('permission-denied', 'Permission denied.');
    }

    let code;

    do {
        code = config.code.generator.generate();
    } while ((await config.code.repository.get(code)).exists);

    const expiryTime = config.code.lifetime * 60 + moment().unix();

    await config.code.repository.save(code, expiryTime);

    return code;
}

export default generateCode;
