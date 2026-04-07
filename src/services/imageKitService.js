const ImageKit = require('@imagekit/nodejs');

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY || 'public_sjn1AZ3gn73eBggHIICoEXJUZqM=',
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/2pe3sztjq',
});

const uploadHazardImage = async (file) => {
    if (!file) {
        throw new Error('Image file is required');
    }

    if (!imagekit.options.privateKey) {
        throw new Error('IMAGEKIT_PRIVATE_KEY is missing on the backend. Configure it to enable image uploads.');
    }

    const safeBaseName = (file.originalname || 'hazard-image').replace(/[^a-zA-Z0-9._-]/g, '-');
    const fileName = `${Date.now()}-${safeBaseName}`;

    const uploadResult = await imagekit.upload({
        file: file.buffer.toString('base64'),
        fileName,
        folder: '/safe-cycling/hazards',
        useUniqueFileName: true,
    });

    return {
        url: uploadResult.url,
        fileId: uploadResult.fileId,
    };
};

module.exports = {
    uploadHazardImage,
};
