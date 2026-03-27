import app from './server';

const PORT = parseInt(process.env.PORT || '3001');

app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
});
