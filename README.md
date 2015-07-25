#Express Server with S3 Persistence

This project is an Express server, that takes and responds with JSON.

It stores the data taken in on the hard drive and a backup on AWS S3. It also stores a user on Mongolabs that tracks the files url and owner.

##Routes

### api/users

GET - Returns a list of the users stored in DB with files listed by their ids.

POST {name: "username"} - Creates a new user in DB. Creates new folder with user name on hard drive. Creates a new bucket on S3.

### api/users/:user

GET - Returns the specified user from the DB with the file field populated.

PUT {name: "username"} - Renames the user in DB. Renames the folder on hard drive. Renames bucket and associated files on S3.

DELETE - Removes specified user from the DB. Deletes their folder from hard drive. Deletes bucket and all associated files on S3.

### api/users/:user/files

GET - Retrieves a list of files from DB for specified user.

POST {name: "filename", content: "contents of file"} - Stores a new file on S3. Stores a new file on the hard drive. Adds a file to db containing a link to the file on S3.

DELETE - Deletes all files for the specified user from S3, hard drive, and DB.

### api/users/:user/files/:file

GET - Returns the specified file from DB with link populated to download from S3.

PUT {name: "newName", content: "newContent" } - Updates content or name of file stored in DB and on hard drive.

DELETE - Removes specified file from S3, hard drive, and DB

