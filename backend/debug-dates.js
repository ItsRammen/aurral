import { connectDB, sequelize } from './src/config/database.js';
import Request from './src/models/Request.js';

const checkDates = async () => {
    await connectDB();

    const requests = await Request.findAll();
    console.log("Found " + requests.length + " requests.");

    requests.forEach(r => {
        console.log(`ID: ${r.uniqueId}, Artist: ${r.artistName}, Timestamp: ${r.timestamp}, Raw: ${JSON.stringify(r)}`);
    });

    process.exit(0);
};

checkDates();
