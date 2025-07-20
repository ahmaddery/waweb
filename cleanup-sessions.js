const fs = require('fs');
const path = require('path');

// Manual cleanup script for locked session files
async function cleanupSessionFiles() {
  console.log('🧹 Starting manual cleanup of session files...');
  
  const authDir = path.join(__dirname, '.wwebjs_auth');
  
  if (!fs.existsSync(authDir)) {
    console.log('📂 No .wwebjs_auth directory found');
    return;
  }
  
  try {
    const sessions = fs.readdirSync(authDir);
    console.log(`📊 Found ${sessions.length} session directories`);
    
    for (const sessionDir of sessions) {
      const sessionPath = path.join(authDir, sessionDir);
      
      try {
        const stats = fs.statSync(sessionPath);
        if (stats.isDirectory()) {
          console.log(`🗂️  Processing session: ${sessionDir}`);
          
          // Try to delete the session directory
          await deleteWithRetry(sessionPath, sessionDir);
        }
      } catch (error) {
        console.error(`❌ Error processing ${sessionDir}:`, error.message);
      }
    }
    
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Error reading auth directory:', error.message);
  }
}

async function deleteWithRetry(sessionPath, sessionName, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`⏳ Retry ${attempt}/${maxRetries} for ${sessionName}...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log(`✅ Successfully deleted: ${sessionName}`);
      return;
    } catch (error) {
      if (error.code === 'EBUSY' || error.code === 'ENOTEMPTY') {
        console.warn(`⚠️  Attempt ${attempt}: ${sessionName} is busy (${error.code})`);
        
        if (attempt === maxRetries) {
          console.error(`❌ Failed to delete ${sessionName} after ${maxRetries} attempts`);
          console.log(`💡 You may need to:
1. Close all Chrome/Chromium processes
2. Restart your computer
3. Manually delete: ${sessionPath}`);
        }
      } else {
        console.error(`❌ Unexpected error for ${sessionName}:`, error.message);
        break;
      }
    }
  }
}

// Run cleanup if script is called directly
if (require.main === module) {
  cleanupSessionFiles().then(() => {
    console.log('🏁 Cleanup script finished');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Cleanup script failed:', error);
    process.exit(1);
  });
}

module.exports = { cleanupSessionFiles, deleteWithRetry };
