const { exec } = require('child_process');

console.log("Starting build...");
exec('./gradlew assembleDebug', { cwd: './android' }, (err, stdout, stderr) => {
  const fs = require('fs');
  fs.writeFileSync('build_output.log', stdout || '');
  fs.writeFileSync('build_error.log', stderr || '');
  if (err) {
    fs.writeFileSync('build_err_obj.log', err.toString());
    console.log("Build failed.");
  } else {
    console.log("Build succeeded.");
  }
});
