const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'routes');
const modelsDir = path.join(__dirname, 'models');

// Ensure directories exist
if (!fs.existsSync(routesDir)) {
  fs.mkdirSync(routesDir, { recursive: true });
  console.log('✅ Created routes directory');
}

// List of required route files
const routeFiles = [
  'auth.js',
  'members.js', 
  'attendance.js',
  'subgroups.js',
  'reports.js',
  'meetings.js',
  'notifications.js'
];

// Create missing route files with basic template
routeFiles.forEach(file => {
  const filePath = path.join(routesDir, file);
  if (!fs.existsSync(filePath)) {
    const basicRoute = `const express = require('express');
const router = express.Router();

// Basic ${file} routes
router.get('/', (req, res) => {
  res.json({ message: '${file} route working' });
});

module.exports = router;
`;
    fs.writeFileSync(filePath, basicRoute);
    console.log(`✅ Created missing route: ${file}`);
  }
});

// Check models
const modelFiles = [
  'User.js',
  'Member.js',
  'Subgroup.js',
  'Attendance.js',
  'Notification.js',
  'Meeting.js'
];

modelFiles.forEach(file => {
  const filePath = path.join(modelsDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Missing model: ${file}`);
  }
});

console.log('\n✅ Route files check complete!');
console.log('📁 Routes folder:', fs.readdirSync(routesDir));