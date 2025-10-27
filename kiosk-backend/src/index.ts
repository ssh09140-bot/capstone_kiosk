import app from './app';

// --- Server Startup ---
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`🚀 Backend server is running on port ${PORT}.`);
});