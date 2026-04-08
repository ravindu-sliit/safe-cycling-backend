const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const VALID_ROLES = ['admin', 'organization'];

const printUsage = () => {
    console.log('Usage:');
    console.log('  npm run create-admin -- existing@email.com [admin|organization]');
    console.log('  npm run create-admin -- "Full Name" new@email.com password [admin|organization]');
};

const normalizeRole = (role) => {
    const normalizedRole = (role || 'admin').trim().toLowerCase();

    if (!VALID_ROLES.includes(normalizedRole)) {
        throw new Error(`Invalid role "${role}". Allowed roles: ${VALID_ROLES.join(', ')}`);
    }

    return normalizedRole;
};

const promoteExistingUser = async (email, role) => {
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error(`No user found for ${email}. Create the user first or use the full command to create one.`);
    }

    user.role = role;
    user.isVerified = true;
    user.verificationToken = undefined;

    await user.save();

    console.log(`Updated ${email} to role "${role}" and marked the account as verified.`);
};

const createOrUpdateUser = async (name, email, password, role) => {
    let user = await User.findOne({ email });

    if (user) {
        user.name = name;
        user.password = password;
        user.role = role;
        user.isVerified = true;
        user.verificationToken = undefined;

        await user.save();
        console.log(`Updated existing user ${email} with role "${role}".`);
        return;
    }

    user = await User.create({
        name,
        email,
        password,
        role,
        isVerified: true,
        verificationToken: undefined,
    });

    console.log(`Created ${role} user ${user.email}.`);
};

const run = async () => {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        printUsage();
        process.exit(1);
    }

    await connectDB();

    try {
        if (args.length <= 2 && args[0].includes('@')) {
            const [email, requestedRole] = args;
            const role = normalizeRole(requestedRole);
            await promoteExistingUser(email, role);
        } else if (args.length >= 3) {
            const [name, email, password, requestedRole] = args;
            const role = normalizeRole(requestedRole);
            await createOrUpdateUser(name, email, password, role);
        } else {
            printUsage();
            process.exitCode = 1;
        }

        console.log('Log out and sign back in with that account so the frontend session picks up the new role.');
    } finally {
        await mongoose.disconnect();
    }
};

run().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
