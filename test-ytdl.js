const youtubedl = require('youtube-dl-exec');
youtubedl('https://www.youtube.com/watch?v=jNQXAC9IVRw', {
    dumpJson: true,
    noWarnings: true,
    noCheckCertificates: true
}).then(output => console.log(output.title)).catch(err => console.error("ERROR CAUGHT: ", err));
