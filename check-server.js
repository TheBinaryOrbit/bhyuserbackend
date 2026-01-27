import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function checkServer() {
    try {
        const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
        console.log('✓ Server is healthy!');
        console.log('Response:', response.data);
        return true;
    } catch (error) {
        console.log('✗ Server check failed:');
        if (error.code === 'ECONNREFUSED') {
            console.log('  - Server is not running or not accepting connections');
        } else if (error.code === 'ETIMEDOUT') {
            console.log('  - Connection timed out');
        } else {
            console.log('  -', error.message);
        }
        return false;
    }
}

checkServer().then(process.exit);
