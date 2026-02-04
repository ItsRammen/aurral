import { connectDB, sequelize } from './src/config/database.js';
import Request from './src/models/Request.js';
import Like from './src/models/Like.js';
import Play from './src/models/Play.js';

const checkData = async () => {
    await connectDB();

    const requestCount = await Request.count();
    const likeCount = await Like.count();
    const playCount = await Play.count();

    console.log(`Requests: ${requestCount}`);
    console.log(`Likes: ${likeCount}`);
    console.log(`Plays (History): ${playCount}`);

    process.exit(0);
};

checkData();
