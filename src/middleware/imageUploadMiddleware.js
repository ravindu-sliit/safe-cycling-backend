const express = require('express');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const createRequestError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const extractBoundary = (contentType = '') => {
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    return (boundaryMatch?.[1] || boundaryMatch?.[2] || '').trim();
};

const isMultipartFormRequest = (req) => req.headers['content-type']?.includes('multipart/form-data');

const parseMultipartParts = (buffer, boundary) => {
    const boundaryMarker = `--${boundary}`;
    const rawBody = buffer.toString('latin1');
    const parts = rawBody.split(boundaryMarker);
    const parsedParts = [];

    for (const part of parts) {
        if (!part || part === '--' || part === '--\r\n') {
            continue;
        }

        const normalizedPart = part.startsWith('\r\n') ? part.slice(2) : part;
        const headerSeparatorIndex = normalizedPart.indexOf('\r\n\r\n');

        if (headerSeparatorIndex === -1) {
            continue;
        }

        const rawHeaders = normalizedPart.slice(0, headerSeparatorIndex);
        const fieldName = rawHeaders.match(/name="([^"]+)"/i)?.[1];
        if (!fieldName) {
            continue;
        }

        const rawContent = normalizedPart.slice(headerSeparatorIndex + 4);
        const trimmedContent = rawContent.endsWith('\r\n') ? rawContent.slice(0, -2) : rawContent;
        const contentBuffer = Buffer.from(trimmedContent, 'latin1');
        const originalname = rawHeaders.match(/filename="([^"]*)"/i)?.[1];

        if (originalname !== undefined) {
            parsedParts.push({
                fieldName,
                buffer: contentBuffer,
                mimetype: rawHeaders.match(/Content-Type:\s*([^\r\n]+)/i)?.[1]?.trim() || 'application/octet-stream',
                originalname,
            });
            continue;
        }

        parsedParts.push({
            fieldName,
            value: contentBuffer.toString('utf8'),
        });
    }

    return parsedParts;
};

const parseMultipartFile = (buffer, boundary, fieldName = 'image') => {
    const matchedPart = parseMultipartParts(buffer, boundary).find(
        (part) => part.fieldName === fieldName && typeof part.originalname === 'string'
    );

    if (!matchedPart) {
        return null;
    }

    return {
        buffer: matchedPart.buffer,
        mimetype: matchedPart.mimetype,
        originalname: matchedPart.originalname || 'upload',
    };
};

const createMultipartImageParser = ({ fileFieldName = 'image', fileFieldNames = [], requireFile = false } = {}) => [
    express.raw({
        type: isMultipartFormRequest,
        limit: '6mb',
    }),
    (req, res, next) => {
        try {
            if (!isMultipartFormRequest(req)) {
                return next();
            }

            if (!Buffer.isBuffer(req.body)) {
                return next(createRequestError(415, 'Please upload an image using multipart form data.'));
            }

            const boundary = extractBoundary(req.headers['content-type']);
            if (!boundary) {
                return next(createRequestError(400, 'Upload boundary is missing from the request.'));
            }

            const parts = parseMultipartParts(req.body, boundary);
            const fields = {};

            parts.forEach((part) => {
                if (typeof part.value === 'string') {
                    fields[part.fieldName] = part.value;
                }
            });

            const acceptedFieldNames = new Set(
                [
                    ...fileFieldNames,
                    fileFieldName,
                ].filter((name) => typeof name === 'string' && name.trim())
            );

            const matchingFilePart = parts.find(
                (part) => acceptedFieldNames.has(part.fieldName) && typeof part.originalname === 'string' && part.originalname
            );

            const file = matchingFilePart
                ? {
                    buffer: matchingFilePart.buffer,
                    mimetype: matchingFilePart.mimetype,
                    originalname: matchingFilePart.originalname,
                }
                : null;

            if (requireFile && (!file || !file.buffer.length)) {
                return next(createRequestError(400, 'Please choose an image to upload.'));
            }

            if (file && !file.mimetype.startsWith('image/')) {
                return next(createRequestError(400, 'Only image uploads are supported.'));
            }

            if (file && file.buffer.length > MAX_IMAGE_BYTES) {
                return next(createRequestError(413, 'Uploaded image is too large. Please choose a smaller profile photo.'));
            }

            req.file = file
                ? {
                    ...file,
                    size: file.buffer.length,
                }
                : undefined;
            req.body = fields;
            next();
        } catch (error) {
            next(error);
        }
    },
];

const parseSingleImageUpload = createMultipartImageParser({ fileFieldName: 'image', requireFile: true });
module.exports = {
    MAX_IMAGE_BYTES,
    createMultipartImageParser,
    parseMultipartParts,
    parseMultipartFile,
    parseSingleImageUpload,
};
