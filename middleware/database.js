const sqlite3 = require("sqlite3").verbose()

const db = new sqlite3.Database("./db/planetary.db", (err) => {
    if (err) {
        console.error(err)
    }

    console.log("Connected to the database")
})

// (async () => {
//     // open the database
//     const db = await open({
//       filename: './db/planetary.db',
//       driver: sqlite3.Database
//     })
// })()

module.exports = {
    addUser,
    initDB,
    isSharexTokenValid,
    verifyUser,
    logUpload,
    getFileName,
    getUploads,
    flagDelete
}

function initDB() {
    db.serialize(() => { // Run sqlite operation in serial order
        db.run("CREATE TABLE IF NOT EXISTS users(username text, phash text, sharextoken text, isAdmin integer)", (err) => { // Create users table
            if (err) {
                console.error(err)
            }
        })
        db.run("CREATE TABLE IF NOT EXISTS uploads(uploader text, filename text, unixtime text, deletionkey text, thumbnail text, isdeleted integer DEFAULT 0, tags text)", (err) => { // Create uploads table
            if (err) {
                console.error(err)
            }
        })
    })
}

async function addUser(username, passwordhash, sharextoken) {
    var result = new Promise((resolve, reject) => {
        db.run("INSERT INTO users(username, phash, sharextoken, isAdmin) VALUES(?,?,?,?)", [username, passwordhash, sharextoken, 0], (error) => {
            if(error) {
                reject(error)
            }
            else {
                resolve(`Added user ${username}`)
            }
        })
    })
    var res = await result
    return res
}

function verifyUser(username, callback) { // returns passwordhash, isAdmin and other profile information
    db.get('SELECT username, phash, sharextoken, isAdmin FROM users WHERE username = ?', username, function(error, result) {
        if (error) {
            console.error(error)
            return callback(null)
        }
        callback(result)
    })
}

// ? Returns object with a boolean true and the username if the sharex token is found
function isSharexTokenValid(sharextoken, callback) { // returns error (could be null) and object if valid and username
    var res;
    var sql = 'SELECT username FROM users WHERE sharextoken = ?'
    // var result = db.get('SELECT username FROM users WHERE sharextoken = ?', sharextoken)
    
    db.get(sql, sharextoken, function(error, result) {
        if (error) {
            console.error(error)
            return callback(error)
        }
        else {
            if (!result) { // If username is NOT found that has matching sharextoken
                console.log("Sharextoken NOT found")
                callback(null, {
                    valid: false,
                    username: null
                })
            } else {
                console.log("Sharextoken FOUND")
                callback(null, {
                    valid: true,
                    username: result.username
                })
            }
        }
    })
}

// ? Thumbnail is a smaller / shorter image or video of the original file
async function logUpload(sharextoken, filename, deletionKey, thumbnail) { // Will lookup the sharextoken, grab the username, and add a new row to the uploads table with the current timestamp
    db.serialize(() => {
        db.get('SELECT username FROM users WHERE sharextoken = ?', sharextoken, function(error, result) {
            if (error) {
                console.log(error)
                return
            }
            var currentTime = Math.floor(Date.now() / 1000)
            db.run('INSERT INTO uploads (uploader, filename, unixtime, deletionkey, thumbnail) VALUES (?,?,?,?,?)', result.username, filename, currentTime.toString(), deletionKey, thumbnail)
        })
        return // !
    })
}

async function getFileName(deletionkey) { // Get filename associated with deletionkey
    let results = new Promise((resolve, reject) => db.get('SELECT filename FROM uploads WHERE deletionkey = ?', deletionkey, (error, result) => {
        if (error) {
            reject(error)
        }
        if (!result) {
            reject("Invalid file name")
        } else {
            resolve(result.filename)
        }
    }))
    let res = await results
    return res
}

async function getUploads(username) { // Get all uploads for a given user
    let results = new Promise((resolve, reject) => db.all('SELECT uploader, filename, unixtime, deletionkey, thumbnail, isdeleted FROM uploads WHERE uploader = ?', username, (error, result) => {
        if (error) {
            console.log(error)
            reject(error)
        }
        if(!result) {
            reject("Invalid request") // ? no uploads or no user found with that name????
        } else {
            resolve(result)
        }
    }))
    let res = await results
    return res
}

async function flagDelete(deletionkey) { // Flag file as deleted
    var results = new Promise((resolve, reject) => {
        db.run("UPDATE uploads SET isdeleted = 1 WHERE deletionkey = ?", deletionkey, (error) => {
            if(error) {
                reject(error)
            }
            resolve("Successfully deleted")
        })
    })
    var res = await results
    return results
}

// // tags must be an array
// async function setAlbums(deletionkey, album) { // Replaces all tags in field
//     var results = new Promise((resolve, reject) => {
//         db.run("UPDATE uploads SET tags = ? WHERE deletionkey = ?", deletionkey, (error) => {
//             if(error) {
//                 reject(error)
//             }
//             resolve("Successfully deleted")
//         })
//     })
//     var res = await results
//     return results
// }