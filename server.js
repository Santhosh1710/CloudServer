var express = require("express");
var app = express();
var ip = require("ip");
require("dotenv").config();
const dbConfig = require("./config/dbconfig");
const User = require("./models/user");
const PublicLink = require("./models/publiclinks");
var httpObj = require("http");
var http = httpObj.createServer(app);
var mongodb = require("mongodb");
var ObjectId = mongodb.ObjectId;
var bcrypt = require("bcrypt");
var nodemailer = require("nodemailer");
const fs = require("fs-extra");
var URL = "sdfg";
const PORT = 4000;
async function fetchIPAddress() {
  var ipa = await getPublicIP();
  if (ipa) {
      URL = "http://" + ip.address() + ":"+PORT;
      console.log(URL)
  }
}
async function getPublicIP() {
  const response = await fetch('https://api.ipify.org?format=json');
  if (response.ok) {
      const data = await response.json();
      const ip = data.ip;
      return ip;
  }
}

app.set("view engine", "ejs");
app.use("/public", express.static(__dirname + "/public"));
app.use("/MyUploads/public", express.static(__dirname + "/public"));

var session = require("express-session");
var fileSystem = require("fs");

app.use(
  session({
    secret: "secret key",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(function (req, res, next) {
  req.URL = URL;
  req.isLogin = typeof req.session.user !== "undefined";
  req.user = req.session.user;
  next();
});

var formidable = require("express-formidable");
app.use(formidable());
var nodemailerFrom = "sandy171003@gmail.com";
var nodemailerObj = {
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "sandy171003@gmail.com",
    pass: "szor kihw hljl yhqs",
  },
};

function recursiveGetFolder(files, _id) {
  var singleFile = null;
  for (var a = 0; a < files.length; a++) {
    const file = files[a];

    if (file.type == "folder") {
      if (file._id == _id) {
        return file;
      }

      if (file.files.length > 0) {
        singleFile = recursiveGetFolder(file.files, _id);
        if (singleFile != null) {
          return singleFile;
        }
      }
    }
  }
}

function recursiveGetFile(files, _id) {
  var singleFile = null;

  for (var a = 0; a < files.length; a++) {
    const file = files[a];

    if (file.type != "folder") {
      if (file._id == _id) {
        return file;
      }
    }

    if (file.type == "folder" && file.files.length > 0) {
      singleFile = recursiveGetFile(file.files, _id);
      if (singleFile != null) {
        return singleFile;
      }
    }
  }
}

function getUpdatedArray(arr, _id, uploadedObj) {
  for (var a = 0; a < arr.length; a++) {
    if (arr[a].type == "folder") {
      if (arr[a]._id == _id) {
        arr[a].files.push(uploadedObj);
        arr[a]._id = new ObjectId(arr[a]._id);
      }
      if (arr[a].files.length > 0) {
        arr[a]._id = new ObjectId(arr[a]._id);
        getUpdatedArray(arr[a].files, _id, uploadedObj);
      }
    }
  }
  return arr;
}

function removeFile(arr, _id) {
  var size = 0;
  for (var a = 0; a < arr.length; a++) {
    if (arr[a].type != "folder" && arr[a]._id == _id) {
      try {
        fileSystem.unlinkSync(arr[a].filePath);
        size = arr[a].size;
      } catch (exp) {}
      arr.splice(a, 1);
      break;
    }

    if (arr[a].type == "folder" && arr[a].files.length > 0) {
      arr[a]._id = new ObjectId(arr[a]._id);
      removeFile(arr[a].files, _id);
    }
  }
  return {
    updatedArray: arr,
    size: size,
  };
}

function removeFolder(arr, _id) {
  for (var a = 0; a < arr.length; a++) {
    if (arr[a].type == "folder") {
      if (arr[a]._id == _id) {
        var x = arr[a].folderPath;
        fs.remove(x, (error) => {
          if (error) {
            console.error("Error removing directory:", error);
          } else {
            console.log("Directory removed successfully");
          }
        });

        arr.splice(a, 1);
        break;
      }
      if (arr[a].files.length > 0) {
        arr[a]._id = new ObjectId(arr[a]._id);
        removeFolder(arr[a].files, _id);
      }
    }
  }
  return arr;
}

function recursiveGetSharedFolder(files, _id) {
  var singleFile = null;
  for (var a = 0; a < files.length; a++) {
    var file = typeof files[a].file === "undefined" ? files[a] : files[a].file;

    if (file.type == "folder") {
      if (file._id == _id) {
        return file;
      }

      if (file.files.length > 0) {
        singleFile = recursiveGetSharedFolder(file.files, _id);
        if (singleFile != null) {
          return singleFile;
        }
      }
    }
  }
}

function recursiveGetSharedFile(files, _id) {
  var singleFile = null;

  for (var a = 0; a < files.length; a++) {
    var file = typeof files[a].file === "undefined" ? files[a] : files[a].file;

    if (file.type != "folder") {
      if (file._id == _id) {
        return file;
      }
    }

    if (file.type == "folder" && file.files.length > 0) {
      singleFile = recursiveGetSharedFile(file.files, _id);
      if (singleFile != null) {
        return singleFile;
      }
    }
  }
}

function removeSharedFolder(arr, _id) {
  for (var a = 0; a < arr.length; a++) {
    var file = typeof arr[a].file === "undefined" ? arr[a] : arr[a].file;
    if (file.type == "folder") {
      if (file._id == _id) {
        arr.splice(a, 1);
        break;
      }
      if (file.files.length > 0) {
        file._id = new ObjectId(file._id);
        removeSharedFolder(file.files, _id);
      }
    }
  }
  return arr;
}

function removeSharedFile(arr, _id) {
  for (var a = 0; a < arr.length; a++) {
    var file = typeof arr[a].file === "undefined" ? arr[a] : arr[a].file;
    if (file.type != "folder" && file._id == _id) {
      arr.splice(a, 1);
      break;
    }

    if (file.type == "folder" && file.files.length > 0) {
      file._id = new ObjectId(file._id);
      removeSharedFile(file.files, _id);
    }
  }
  return arr;
}

function renameSubFolders(arr, oldName, newName) {
  for (var a = 0; a < arr.length; a++) {
    var pathParts =
      arr[a].type == "folder"
        ? arr[a].folderPath.split("/")
        : arr[a].filePathPath.split("/");

    var newPath = "";
    for (var b = 0; b < pathParts.length; b++) {
      if (pathParts[b] == oldName) {
        pathParts[b] = newName;
      }
      newPath += pathParts[b];
      if (b < pathParts.length - 1) {
        newPath += "/";
      }
    }
    if (arr[a].type == "folder") {
      arra[a].folderPath = newPath;

      if (arr[a].files.length > 0) {
        renameSubFolders(arr[a].files, _id, newName);
      }
    } else {
      arr[a].filePath = newPath;
    }
  }
}

function renameFolder(arr, _id, newName) {
  for (var a = 0; a < arr.length; a++) {
    if (arr[a].type == "folder") {
      if (arr[a]._id == _id) {
        const oldFolderName = arr[a].folderName;
        var folderPathParts = arr[a].folderPath.split("/");

        var newFolderPath = "";
        for (var b = 0; b < folderPathParts.length; b++) {
          if (folderPathParts[b] == oldFolderName) {
            folderPathParts[b] = newName;
          }
          newFolderPath += folderPathParts[b];
          if (b < folderPathParts.length - 1) {
            newFolderPath += "/";
          }
        }
        fileSystem.rename(arr[a].folderPath, newFolderPath, (error) => {});

        arr[a].folderName = newName;
        arr[a].folderPath = newFolderPath;

        renameSubFolders(arr[a].files, oldFolderName, newName);
        break;
      }
      if (arr[a].files.length > 0) {
        renameFolder(arr[a].files, _id, newName);
      }
    }
  }
  return arr;
}

function renameFile(arr, _id, newName) {
  for (var a = 0; a < arr.length; a++) {
    if (arr[a].type != "folder") {
      if (arr[a]._id == _id) {
        const oldFileName = arr[a].name;
        var filePathParts = arr[a].filePath.split("/");

        var newFilePath = "";
        for (var b = 0; b < filePathParts.length; b++) {
          if (filePathParts[b] == oldFileName) {
            filePathParts[b] = newName;
          }
          newFilePath += filePathParts[b];
          if (b < filePathParts.length - 1) {
            newFilePath += "/";
          }
        }
        fileSystem.rename(arr[a].filePath, newFilePath, (error) => {});

        arr[a].name = newName;
        arr[a].filePath = newFilePath;
        break;
      }
    }
    if (arr[a].type == "folder" && arr[a].files.length > 0) {
      renameFile(arr[a].files, _id, newName);
    }
  }
  return arr;
}

function updatedMovedtoFolder(arr, _id, moveFolder) {
  for (var a = 0; a < arr.length; a++) {
    if (arr[a].type == "folder") {
      if (arr[a]._id == _id) {
        moveFolder.folderPath = arr[a].folderPath + "/" + moveFolder.folderName;
        arr[a].files.push(moveFolder);
        break;
      }
      if (arr[a].files.length > 0) {
        arr[a]._id = new ObjectId(arr[a]._id);
        updatedMovedtoFolder(arr[a].files, _id, moveFolder);
      }
    }
  }
  return arr;
}

function moveFolders(arr, _id, moveFolder, moveToFolder) {
  for (var a = 0; a < arr.length; a++) {
    if (arr[a].type == "folder") {
      if (arr[a]._id == _id) {
        const newPath = moveToFolder.folderPath + "/" + arr[a].folderName;
        fileSystem.rename(arr[a].folderPath, newPath, (err) => {});
        arr.splice(a, 1);
        break;
      }
      if (arr[a].files.length > 0) {
        arr[a]._id = new ObjectId(arr[a]._id);
        moveFolders(arr[a].files, _id, moveFolder, moveToFolder);
      }
    }
  }
  return arr;
}

function recursiveGetAllFolder(files, _id) {
  var folders = [];

  for (var a = 0; a < files.length; a++) {
    const file = files[a];
    if (file.type == "folder") {
      if (file._id != _id) {
        folders.push(file);
        if (file.files.length > 0) {
          var tempFolders = recursiveGetAllFolder(file.files, _id);
          for (var b = 0; b < tempFolders.length; b++) {
            folders.push(tempFolders[b]);
          }
        }
      }
    }
  }
  return folders;
}

function recursiveSearch(files, query) {
  const matchingFiles = [];

  for (let file of files) {
    if (file.type === "folder") {
      if (file.folderName.toLowerCase().includes(query.toLowerCase())) {
        matchingFiles.push(file);
      }

      if (file.files.length > 0) {
        const nestedFiles = recursiveSearch(file.files, query);
        matchingFiles.push(...nestedFiles);
      }
    } else {
      if (file.name.toLowerCase().includes(query.toLowerCase())) {
        matchingFiles.push(file);
      }
    }
  }
  return matchingFiles;
}

function recursiveSearchShared(files, query) {
  const matchingFiles = [];

  for (let file of files) {
    const currentFile = typeof file.file === "undefined" ? file : file.file;

    if (currentFile.type === "folder") {
      if (currentFile.folderName.toLowerCase().includes(query.toLowerCase())) {
        matchingFiles.push(currentFile);
      }

      if (currentFile.files.length > 0) {
        const nestedFiles = recursiveSearchShared(currentFile.files, query);
        matchingFiles.push(...nestedFiles);
      }
    } else {
      if (currentFile.name.toLowerCase().includes(query.toLowerCase())) {
        matchingFiles.push(currentFile);
      }
    }
  }

  return matchingFiles;
}

const httpsObj = require('https');
const https = httpsObj.createServer(app);
https.listen(3000, () => {
  console.log(`HTTPS server running on port 3000`);
  app.get("/", async (req, res) => {
    const _id = req.params._id;
    if (req.session.user) {
      const user = await User.findOne({ _id: req.session.user._id });
      var uploaded = null;
      var folderName = "";
      var fileSize = "";
      var createdAt = "";
      if (user.uploaded.length > 0) {
        uploaded = user.uploaded;
        if (user.sharedWithMe.length > 0) {
          user.sharedWithMe.forEach((item) => {
            if (Array.isArray(item)) {
              uploaded.push(...item);
            } else {
              uploaded.push(item);
            }
          });
        }
      } else if (user.sharedWithMe.length > 0) {
        uploaded = user.sharedWithMe;
      }
      res.render("index", {
        req: req,
        uploaded: uploaded,
        _id: _id,
        folderName: folderName,
        createdAt: createdAt,
        fileSize: fileSize,
      });
      return false;
    }
    res.redirect("/Login");
  });
});

http.listen(PORT, () => {
  fetchIPAddress().then;
  console.log("LAN server : http://" + ip.address() + "\n");
  app.get("/", async (req, res) => {
    const _id = req.params._id;
    if (req.session.user) {
      const user = await User.findOne({ _id: req.session.user._id });
      var uploaded = null;
      var folderName = "";
      var fileSize = "";
      var createdAt = "";
      if (user.uploaded.length > 0) {
        uploaded = user.uploaded;
        if (user.sharedWithMe.length > 0) {
          user.sharedWithMe.forEach((item) => {
            if (Array.isArray(item)) {
              uploaded.push(...item);
            } else {
              uploaded.push(item);
            }
          });
        }
      } else if (user.sharedWithMe.length > 0) {
        uploaded = user.sharedWithMe;
      }
      if (uploaded == null) {
        res.render("index", {
          req: req,
          uploaded: uploaded,
          _id: _id,
          folderName: folderName,
          createdAt: createdAt,
          fileSize: fileSize,
        });
        return false;
      }
      res.render("index", {
        req: req,
        uploaded: uploaded,
        _id: _id,
        folderName: folderName,
        createdAt: createdAt,
        fileSize: fileSize,
      });
      return false;
    }
    res.redirect("/Login");
  });

  app.get("/Register", (req, res) => {
    res.render("Register", { req: req });
  });

  app.post("/Register", async (req, res) => {
    const user = await User.findOne({ email: req.fields.email });
    if (user == null) {
      const password = req.fields.password;
      const confirmPassword = req.fields.confirmpassword;
      if (password != confirmPassword) {
        req.status = "error";
        req.message = "Password doesn't match";
        res.render("Register", {
          req: req,
        });
        return false;
      }
      const salt = await bcrypt.genSalt(10);
      const hashedpwd = await bcrypt.hash(req.fields.password, salt);
      req.fields.password = hashedpwd;

      const newuser = new User(req.fields);
      await newuser.save();
      const token = newuser.verification_token;
      var transporter = nodemailer.createTransport(nodemailerObj);
      var text =
        "Please verify your account by clicking the following link : " +
        URL +
        "/verify/" +
        req.fields.email +
        "/" +
        req.fields.verification_token;

      var html =
        "Please verify your accont by clicking the following link: <br><br> <a href='" +
        URL +
        "/verify/" +
        req.fields.email +
        "/" +
        token +
        `'> Confirm Email </a><br><br> Thankyou.`;

      await transporter.sendMail(
        {
          from: nodemailerFrom,
          to: req.fields.email,
          subject: "Email Verification",
          text: text,
          html: html,
        },
        function (error, info) {
          if (error) {
            console.error(error);
          } else {
            console.log("Email Sent : " + info.response);
          }
        }
      );
      req.status = "success";
      req.message =
        "Signed up successfully. An email has been sent to your email id. Click the link to verify your account.";
      res.render("Register", { req: req });
    } else {
      req.status = "error";
      req.message = "Email already exists";
      res.render("Register", { req: req });
    }
  });

  app.get("/verify/:email/:verification_token", async (req, res) => {
    var email = req.params.email;
    var verification_token = req.params.verification_token;

    const user = await User.findOne({
      email: email,
      verification_token: parseInt(verification_token),
    });

    if (user == null) {
      req.status = "error";
      req.message = "Email does not exist or verification link has expired.";

      res.render("Login", { req: req });
    } else {
      user.verification_token = "";
      user.isVerified = true;
      const updatedUser = await User.findByIdAndUpdate(user._id, user);
      fileSystem.mkdirSync("public/uploads/" + user.email);
      req.status = "success";
      req.message = "Account has been verified. Login to Continue.";

      res.render("Login", { req: req });
    }
  });

  app.get("/Login", (req, res) => {
    if (req.session.user) {
      res.redirect("/");
      return false;
    }
    res.render("Login", { req: req });
  });

  app.post("/Login", async (req, res) => {
    var email = req.fields.email;
    var password = req.fields.password;

    const user = await User.findOne({ email: email });

    if (user == null) {
      req.status = "error";
      req.message = "User does not Exist";
      res.render("Login", { req: req });
      return false;
    } else {
      const isMatch = await bcrypt.compare(password, user.password);
      if (user.isVerified && isMatch) {
        req.session.user = user;
        res.redirect("/");
        return;
      } else if (isMatch) {
        req.status = "error";
        req.message = "Kindly verify your email";
        res.render("Login", { req: req });
        return false;
      }
      req.status = "error";
      req.message = "Incorrect Password";
      res.render("Login", { req: req });
      return false;
    }
  });

  app.get("/ForgotPassword", (req, res) => {
    res.render("ForgotPassword", { req: req });
  });

  app.post("/sendRecoveryLink", async (req, res) => {
    var email = req.fields.email;
    const user = await User.findOne({ email: email });

    if (user == null) {
      req.status = "error";
      req.message = "User does not Exist";
      res.render("ForgotPassword", { req: req });
      return false;
    } else {
      reset_token = new Date().getTime();
      user.reset_token = reset_token;
      const updatedUser = await User.findByIdAndUpdate(user._id, user);
      var transporter = nodemailer.createTransport(nodemailerObj);
      var text =
        "Please the click the following link to reset your password : " +
        URL +
        "/ResetPassword/" +
        req.fields.email +
        "/" +
        reset_token;

      var html =
        "Please the click the following link to reset your password: <br><br> <a href='" +
        URL +
        "/ResetPassword/" +
        req.fields.email +
        "/" +
        reset_token +
        `'>Reset Password</a><br><br> Thankyou.`;

      await transporter.sendMail(
        {
          from: nodemailerFrom,
          to: req.fields.email,
          subject: "Reset Password",
          text: text,
          html: html,
        },
        function (error, info) {
          if (error) {
            console.error(error);
          } else {
            console.log("Email Sent : " + info.response);
          }
        }
      );
      req.status = "success";
      req.message = "Email has been sent with the link to reset the password";
      res.render("Login", { req: req });
    }
  });

  app.get("/ResetPassword/:email/:reset_token", async (req, res) => {
    var email = req.params.email;
    var reset_token = req.params.reset_token;

    const user = await User.findOne({
      email: email,
      reset_token: parseInt(reset_token),
    });

    if (user == null) {
      req.status = "error";
      req.message = "Link has expired.";

      res.render("Login", { req: req });
      return false;
    }
    res.render("ResetPassword", {
      req: req,
      email: email,
      reset_token: reset_token,
    });
  });

  app.post("/ResetPassword", async (req, res) => {
    var email = req.fields.email;
    var reset_token = req.fields.reset_token;
    var password = req.fields.password;
    var confirm_password = req.fields.confirm_password;

    if (password != confirm_password) {
      req.status = "error";
      req.message = "Password doesn't match";
      res.render("ResetPassword", {
        req: req,
        email: email,
        reset_token: reset_token,
      });
      return false;
    }
    const user = await User.findOne({
      email: email,
      reset_token: parseInt(reset_token),
    });
    const salt = await bcrypt.genSalt(10);
    const hashedpwd = await bcrypt.hash(password, salt);
    user.reset_token = "";
    user.password = hashedpwd;
    const updatedUser = await User.findByIdAndUpdate(user._id, user);

    req.status = "success";
    req.message = "Password has been changed. Continue to login";
    res.render("Login", { req: req });
  });

  app.get("/Profile", async (req, res) => {
    if (req.session.user) {
      const user = await User.findOne({ _id: req.session.user });
      res.render("Profile", { req: req, user: user });
      return false;
    }
    res.redirect("/Login");
  });

  app.post("/Rename", async (req, res) => {
    const name = req.fields.name;
    if (req.session.user) {
      const user = await User.findOne({ _id: req.session.user._id });
      await User.updateOne(
        {
          _id: req.session.user._id,
        },
        {
          $set: {
            name: name,
          },
        }
      );
      const back = req.header("Referer") || "/";
      res.redirect(back);
      return false;
    }
    res.redirect("/Login");
  });

  app.post("/ChangePassword", async (req, res) => {
    const password = req.fields.password;
    const back = req.header("Referer") || "/";
    if (req.session.user) {
      const salt = await bcrypt.genSalt(10);
      const hashedpwd = await bcrypt.hash(password, salt);
      await User.updateOne(
        {
          _id: req.session.user._id,
        },
        {
          $set: {
            password: hashedpwd,
          },
        }
      );
      req.status = "success";
      req.message = "Password has been changed. Continue to login";
      res.redirect(back);
      return false;
    }
    res.redirect("/Login");
  });

  app.get("/Logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
  });

  app.get("/Search", async (req, res) => {
    const search = req.query.search;
    if (req.session.user) {
      var user = await User.findOne({ _id: req.session.user._id });
      var fileUploaded = await recursiveSearch(user.uploaded, search);
      var fileShared = await recursiveSearchShared(user.sharedWithMe, search);
      var files = [];
      if (fileUploaded) {
        files = fileUploaded;
      }
      if (fileShared) {
        fileShared.forEach((item) => {
          if (Array.isArray(item)) {
            files.push(...item);
          } else {
            files.push(item);
          }
        });
      }      
      if (files.length === 0) {
        req.status = "error";
        req.message = "File/Folder '" + search + "' is not found.";
        res.render("Search", { req: req });
      } else {
        const isShared = fileUploaded ? false : true;
        res.render("Search", {
          req: req,
          files: files,
          isShared: isShared,
        });
      }
      return false;
    }
    res.redirect("/Login");
  });

  app.get("/SharedViaLink/:hash", async (req, res) => {
    const hash = req.params.hash;
    var link = await PublicLink.findOne({ hash: hash });
    if (link == null) {
      req.session.status = "error";
      req.session.message = "Link expired";

      res.render("SharedViaLink", {
        req: req,
      });
      return false;
    }
    res.render("SharedViaLink", {
      req: req,
      link: link,
    });
  });

  app.get("/MySharedLinks", async (req, res) => {
    if (req.session.user) {
      var links = await PublicLink.find({
        "uploadedBy._id": req.session.user._id,
      }).exec();
      res.render("MySharedLinks", {
        req: req,
        links: links,
      });
      return false;
    }
    res.redirect("/Login");
  });

  app.post("/DeleteLink", async (req, res) => {
    const _id = req.fields._id;

    if (req.session.user) {
      var link = await PublicLink.find({
        "uploadedBy._id": req.session.user._id,
        _id: _id,
      });
      if (link == null) {
        req.status = "error";
        req.message = "Link does not exist";

        const back = req.header("Referer") || "/";
        res.redirect(back);
        return false;
      }

      await PublicLink.deleteOne({
        "uploadedBy._id": req.session.user._id,
        _id: _id,
      });
      req.status = "success";
      req.message = "Link has been deleted";

      const back = req.header("Referer") || "/";
      res.redirect(back);
      return false;
    }
    res.redirect("/Login");
  });

  app.post("/ShareViaLink", async (req, res) => {
    const _id = req.fields._id;
    if (req.session.user) {
      const user = await User.findOne({ _id: req.session.user._id });
      var file = await recursiveGetFile(user.uploaded, _id);
      var folder = await recursiveGetFolder(user.uploaded, _id);

      if (file == null && folder == null) {
        req.session.status = "error";
        req.session.message = "File does not exist";
        const back = req.header("Referer") || "/";
        res.redirect(back);
        return false;
      }

      if (folder != null) {
        folder.name = folder.folderName;
        folder.filePath = folder.folderPath;
        delete folder.files;
        file = folder;
      }

      bcrypt.hash(file.name, 10, async (error, hash) => {
        hash = hash.substring(10, 20).replace(/\//g, '');
        const link = URL + "/SharedViaLink/" + hash;
        const linkInstance = new PublicLink({
          hash: hash,
          file: file,
          uploadedBy: {
            _id: user._id,
            name: user.name,
            email: user.email,
          },
        });
        const savedLink = await linkInstance.save();
        req.session.status = "success";
        req.session.message = "Share Link: " + link;
        req.session.copylink = link;
        req.session.copy = true;
        const back = req.header("Referer") || "/";
        res.redirect(back);
      });
      return false;
    }
    return res.redirect("/Login");
  });

  app.post("/GetAllFolders", async (req, res) => {
    const _id = req.fields._id;
    const type = req.fields.type;
    if (req.session.user) {
      const user = await User.findOne({ _id: req.session.user._id });
      var tempAllFolders = recursiveGetAllFolder(user.uploaded, _id);
      var folders = [];
      for (var a = 0; a < tempAllFolders.length; a++) {
        folderPath = tempAllFolders[a].folderPath;
        let index = folderPath.indexOf("@gmail.com") + 10;
        folderPath = folderPath.substring(index);
        folders.push({
          _id: tempAllFolders[a]._id,
          folderName: tempAllFolders[a].folderName,
          folderPath: folderPath,
        });
      }
      res.json({
        status: "success",
        message: "Record has been fetched",
        folders: folders,
      });
      return false;
    }
    return res.redirect("/Login");
  });

  app.post("/MoveFile", async (req, res) => {
    const _id = req.fields._id;
    const type = req.fields.type;
    const folder = req.fields.folder;

    if (req.session.user) {
      const user = await User.findOne({ _id: req.session.user._id });
      var updatedArray = user.uploaded;

      if (type == "folder") {
        var moveFolder = await recursiveGetFolder(user.uploaded, _id);
        var moveToFolder = await recursiveGetFolder(user.uploaded, folder);
        updatedArray = await moveFolders(
          user.uploaded,
          _id,
          moveFolder,
          moveToFolder
        );

        updatedArray = await updatedMovedtoFolder(
          updatedArray,
          folder,
          moveFolder
        );
      }
      await User.updateOne(
        {
          _id: req.session.user._id,
        },
        {
          $set: {
            uploaded: updatedArray,
          },
        }
      );
      const back = req.header("Referer") || "/";
      res.redirect(back);
      return false;
    }
    return res.redirect("/Login");
  });

  app.post("/Download", async (req, res) => {
    const _id = req.fields._id;

    if (req.session.user) {
      const user = await User.findOne({ _id: req.session.user._id });
      var fileUploaded = await recursiveGetFile(user.uploaded, _id);
      var fileShared = await recursiveGetSharedFile(user.sharedWithMe, _id);

      if (fileUploaded == null && fileShared == null) {
        res.json({
          status: "error",
          message: "File is neither uploaded nor shared with you",
        });
      }

      var file = fileUploaded == null ? fileShared : fileUploaded;

      fileSystem.readFile(file.filePath, (error, data) => {
        res.json({
          status: "success",
          message: "Data has been fetched.",
          arrayBuffer: data,
          fileType: file.type,
          fileName: file.name,
        });
      });
      return false;
    }
    return res.redirect("/Login");
  });

  app.post("/ViewFile", async (req, res) => {
    const _id = req.fields._id;

    if (req.session.user) {
      const user = await User.findOne({ _id: req.session.user._id });
      var fileUploaded = await recursiveGetFile(user.uploaded, _id);

      if (fileUploaded == null && fileShared == null) {
        res.json({
          status: "error",
          message: "File not found",
          content: "",
        });
      }

      var file = fileUploaded == null ? fileShared : fileUploaded;

      fileSystem.readFile(file.filePath, (error, data) => {
        res.json({
          status: "success",
          message: "Data has been fetched.",
          content: data,
        });
      });
      return false;
    }
    return res.redirect("/Login");
  });

  app.post("/RenameFile", async (req, res) => {
    const _id = req.fields._id;
    const name = req.fields.name;
    if (req.session.user) {
      const user = await User.findOne({ _id: req.session.user._id });
      var updatedArray = await renameFile(user.uploaded, _id, name);
      for (var a = 0; a < updatedArray.length; a++) {
        updatedArray[a]._id = new ObjectId(updatedArray[a]._id);
      }
      await User.updateOne(
        {
          _id: req.session.user._id,
        },
        {
          $set: {
            uploaded: updatedArray,
          },
        }
      );

      const back = req.header("Referer") || "/";
      res.redirect(back);
      return false;
    }
    res.redirect("/Login");
  });

  app.post("/RenameFolder", async (req, res) => {
    const _id = req.fields._id;
    const name = req.fields.name;
    if (req.session.user) {
      const user = await User.findOne({ _id: req.session.user._id });
      var updatedArray = await renameFolder(user.uploaded, _id, name);
      for (var a = 0; a < updatedArray.length; a++) {
        updatedArray[a]._id = new ObjectId(updatedArray[a]._id);
      }
      await User.updateOne(
        {
          _id: req.session.user._id,
        },
        {
          $set: {
            uploaded: updatedArray,
          },
        }
      );

      const back = req.header("Referer") || "/";
      res.redirect(back);
      return false;
    }
    res.redirect("/Login");
  });

  app.post("/DeleteSharedFile", async (req, res) => {
    const _id = req.fields._id;

    if (req.session.user) {
      const user = await User.findOne({ _id: req.session.user._id });

      var updatedArray = await removeSharedFile(user.sharedWithMe, _id);
      for (var a = 0; a < updatedArray.length; a++) {
        updatedArray[a]._id = new ObjectId(updatedArray[a]._id);
      }

      await User.updateOne(
        {
          _id: req.session.user._id,
        },
        {
          $set: {
            sharedWithMe: updatedArray,
          },
        }
      );

      const back = req.header("Referer") || "/";
      res.redirect(back);
      return false;
    }
    res.redirect("/Login");
  });

  app.post("/DeleteSharedDirectory", async (req, res) => {
    const _id = req.fields._id;
    console.log(_id);
    if (req.session.user) {
      const user = await User.findOne({ _id: req.session.user._id });
      var updatedArray = await removeSharedFolder(user.sharedWithMe, _id);
      for (var a = 0; a < updatedArray.length; a++) {
        updatedArray[a]._id = new ObjectId(updatedArray[a]._id);
      }
      await User.updateOne(
        {
          _id: req.session.user._id,
        },
        {
          $set: {
            sharedWithMe: updatedArray,
          },
        }
      );
      //error in going back
      const back = req.header("Referer") || "/";
      res.redirect(back);
      return false;
    }
    res.redirect("/Login");
  });

  app.get("/SharedWithMe/:_id?", async (req, res) => {
    const _id = req.params._id;
    if (req.session.user) {
      const user = await User.findOne({ _id: req.session.user._id });
      var files = null;
      var folderName = "";
      if (typeof _id == "undefined") {
        files = user.sharedWithMe;
      } else {
        var folderObj = await recursiveGetSharedFolder(user.sharedWithMe, _id);
        if (folderObj == null) {
          req.status = "error";
          req.message = "Folder not found";
          res.render("Error", {
            req: req,
          });
          return false;
        }
        files = folderObj.files;
        folderName = folderObj.folderName;
      }
      if (files === null) {
        req.status = "error";
        req.message = "Directory not found";
        res.render("Error", {
          req: req,
        });
        return false;
      }
      res.render("SharedWithMe", {
        req: req,
        files: files,
        _id: _id,
        folderName: folderName,
      });
      return false;
    }
    res.redirect("/Login");
  });

  app.post("/RemoveSharedAccess", async (req, res) => {
    try {
      const _id = req.fields._id;
      const objId = req.fields.sharedObjId;
      if (req.session.user) {
        const userId = req.session.user._id;
        const user = await User.findOneAndUpdate(
          {
            _id: _id,
          },
          {
            $pull: {
              sharedWithMe: {},
            },
          },
          { new: true }
        );
        if (!user) {
          req.session.status = "error";
          req.session.message = "Shared access not found or unauthorized.";
          return res.redirect("/");
        }

        for (let a = 0; a < user.sharedWithMe.length; a++) {
          if (user.sharedWithMe[a]._id === objId) {
            user.sharedWithMe.splice(a, 1);
            break;
          }
        }

        await User.findOneAndUpdate(
          {
            _id: _id,
          },
          {
            $set: {
              sharedWithMe: user.sharedWithMe,
            },
          }
        );

        req.session.status = "success";
        req.session.message = "Shared Access has been redacted.";
        const back = req.header("Referer") || "/";
        return res.redirect(back);
      }
      return res.redirect("/Login");
    } catch (exp) {
      console.error(exp);
      req.session.status = "error";
      req.session.message = "An error occurred while removing shared access.";
      return res.redirect("/");
    }
  });

  app.post("/GetFileSharedWith", async (req, res) => {
    const _id = req.fields._id;
    if (req.session.user) {
      const tempUsers = await User.find().exec();
      var users = [];
      for (let a = 0; a < tempUsers.length; a++) {
        let sharedObj = null;

        for (let b = 0; b < tempUsers[a].sharedWithMe.length; b++) {
          const fileId = tempUsers[a].sharedWithMe[b].file._id.toString();
          if (fileId === _id) {
            sharedObj = {
              _id: tempUsers[a].sharedWithMe[b]._id,
              sharedAt: tempUsers[a].sharedWithMe[b].createdAt,
            };
            users.push({
              id: tempUsers[a]._id,
              name: tempUsers[a].name,
              email: tempUsers[a].email,
              sharedObj: sharedObj,
            });
            break;
          }
        }
      }

      res.json({
        status: "success",
        message: "Record has been fetched",
        users: users,
      });
      return false;
    }
    return res.redirect("/Login");
  });

  app.post("/DeleteFolder", async (req, res) => {
    const _id = req.fields._id;

    if (req.session.user) {
      const user = await User.findOne({ _id: req.session.user._id });
      var updatedArray = await removeFolder(user.uploaded, _id);
      for (var a = 0; a < updatedArray.length; a++) {
        updatedArray[a]._id = new ObjectId(updatedArray[a]._id);
      }

      await User.updateOne(
        {
          _id: req.session.user._id,
        },
        {
          $set: {
            uploaded: updatedArray,
          },
        }
      );

      res.redirect("/MyUploads");
      return false;
    }
    res.redirect("/Login");
  });

  app.post("/Share", async (req, res) => {
    const _id = req.fields._id;
    const type = req.fields.type;
    const email = req.fields.email;

    if (req.session.user) {
      const user = await User.findOne({ email: email });
      if (user == null) {
        (req.session.status = "error"),
          (req.session.message = "User " + email + " does not exists."),
          res.redirect("/MyUploads");
      }

      if (!user.isVerified) {
        (req.session.status = "error"),
          (req.session.message = "User " + email + " account is not verified."),
          res.redirect("/MyUploads");
      }

      const me = await User.findOne({ _id: req.session.user._id });
      var file = null;
      if (type == "folder") {
        file = await recursiveGetFolder(me.uploaded, _id);
      } else {
        file = await recursiveGetFile(me.uploaded, _id);
      }

      if (file == null) {
        (req.session.status = "error"),
          (req.session.message = "File does not exist."),
          res.redirect("/MyUploads");
      }

      file._id = new ObjectId(file._id);
      const sharedBy = me;
      await User.findOneAndUpdate(
        { _id: user._id },
        {
          $push: {
            sharedWithMe: {
              _id: new ObjectId(),
              file: file,
              sharedBy: {
                _id: sharedBy._id,
                name: sharedBy.name,
                email: sharedBy.email,
              },
              shared: true,
              createdAt: new Date().getTime(),
            },
          },
        },
        { new: true }
      );
      const back = req.header("Referer") || "/";
      (req.session.status = "success"),
        (req.session.message = "File has been shared with " + user.name + "."),
        res.redirect(back);
      return false;
    }
  });

  app.post("/GetUser", async (req, res) => {
    const email = req.fields.email;
    if (req.session.user) {
      const user = await User.findOne({ email: email });
      if (user == null) {
        res.json({
          status: "error",
          message: "User " + email + " does not exists.",
        });
        return false;
      }

      if (!user.isVerified) {
        res.json({
          status: "error",
          message: "User " + email + " account is not verified.",
        });
        return false;
      }
      res.json({
        status: "success",
        message: "Data has been fetched",
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
      });
      return false;
    }
    res.json({
      status: "error",
      message: "Please Login to fetch user",
    });
    return false;
  });

  app.post("/DeleteFile", async (req, res) => {
    const _id = req.fields._id;

    if (req.session.user) {
      const user = await User.findOne({ _id: req.session.user._id });

      var { updatedArray, size } = await removeFile(user.uploaded, _id);
      size = user.usedStorage - size;
      for (var a = 0; a < updatedArray.length; a++) {
        updatedArray[a]._id = new ObjectId(updatedArray[a]._id);
      }

      await User.updateOne(
        {
          _id: req.session.user._id,
        },
        {
          $set: {
            uploaded: updatedArray,
            usedStorage: size,
          },
        }
      );

      const back = req.header("Referer") || "/";
      res.redirect(back);
      return false;
    }
    res.redirect("/Login");
  });

  app.post("/UploadFile", async (req, res) => {
    if (req.session.user) {
      const user = await User.findOne({ _id: req.session.user._id });
      if (req.files.file.size > 0) {
        const _id = req.fields._id;
        var name = req.files.file.name;
        var ext = name.substring(name.lastIndexOf("."));
        name = name.substring(0, name.lastIndexOf("."));
        var uploadedObj = {
          _id: new ObjectId(),
          size: req.files.file.size,
          name: name,
          ext: ext,
          type: req.files.file.type,
          filePath: "",
          createdAt: new Date().getTime(),
        };
        var filePath = "";
        var size = user.usedStorage + uploadedObj.size;
        if (_id == "") {
          filePath =
            "public/uploads/" +
            user.email +
            "/" +
            new Date().getTime() +
            "-" +
            req.files.file.name;
          uploadedObj.filePath = filePath;

          fileSystem.readFile(req.files.file.path, (err, data) => {
            if (err) throw err;

            fileSystem.writeFile(filePath, data, async (err) => {
              if (err) throw err;

              await User.updateOne(
                { _id: req.session.user._id },
                {
                  $set: {
                    usedStorage: size,
                  },
                  $push: {
                    uploaded: uploadedObj,
                  },
                }
              );

              res.redirect("/MyUploads/" + _id);
            });

            fileSystem.unlink(req.files.file.path, (err) => {
              if (err) throw err;
            });
          });
        } else {
          var folderObj = await recursiveGetFolder(user.uploaded, _id);
          uploadedObj.filePath =
            folderObj.folderPath + "/" + req.files.file.name;
          var updatedArray = await getUpdatedArray(
            user.uploaded,
            _id,
            uploadedObj
          );

          fileSystem.readFile(req.files.file.path, (err, data) => {
            if (err) throw err;

            fileSystem.writeFile(uploadedObj.filePath, data, async (err) => {
              if (err) throw err;

              for (var a = 0; a < updatedArray.length; a++) {
                updatedArray[a]._id = new ObjectId(updatedArray[a]._id);
              }
              await User.updateOne(
                { _id: req.session.user._id },
                {
                  $set: {
                    uploaded: updatedArray,
                  },
                }
              );

              res.redirect("/MyUploads/" + _id);
            });

            fileSystem.unlink(req.files.file.path, (err) => {
              if (err) throw err;
            });
          });
        }
      } else {
        req.status = "error";
        req.message = "please select valid image";
        res.render("MyUploads", { req: req });
      }
      return false;
    }
    res.redirect("/Login");
  });

  app.post("/CreateFolder", async (req, res) => {
    try {
      const name = req.fields.name;
      const _id = req.fields._id;
      if (req.session.user) {
        const user = await User.findOne({ _id: req.session.user._id });
        var uploadedObj = {
          _id: new ObjectId(),
          type: "folder",
          folderName: name,
          files: [],
          folderPath: "",
          createdAt: new Date().getTime(),
        };

        var folderPath = "";
        var updatedArray = [];
        if (_id == "") {
          folderPath = "public/uploads/" + user.email + "/" + name;
          uploadedObj.folderPath = folderPath;

          if (!fileSystem.existsSync("public/uploads/" + user.email)) {
            fileSystem.mkdirSync("public/uploads/" + user.email);
          }
        } else {
          var folderObj = await recursiveGetFolder(user.uploaded, _id);
          uploadedObj.folderPath = folderObj.folderPath + "/" + name;
          updatedArray = await getUpdatedArray(user.uploaded, _id, uploadedObj);
        }

        if (uploadedObj.folderPath == "") {
          req.session.status = "error";
          req.session.message = "Folder name should not be empty";
          res.redirect("/MyUploads");
          return false;
        }

        if (fileSystem.existsSync(uploadedObj.folderPath)) {
          req.session.status = "error";
          req.session.message = "Folder with same name already exists";
          res.redirect("/MyUploads");
          return false;
        }

        fileSystem.mkdirSync(uploadedObj.folderPath);

        if (_id == "") {
          await User.updateOne(
            {
              _id: req.session.user._id,
            },
            {
              $push: {
                uploaded: uploadedObj,
              },
            }
          );
        } else {
          for (var a = 0; a < updatedArray.length; a++) {
            updatedArray[a]._id = new ObjectId(updatedArray[a]._id);
          }
          await User.updateOne(
            {
              _id: req.session.user._id,
            },
            {
              $set: {
                uploaded: updatedArray,
              },
            }
          );
        }
        res.redirect("/MyUploads/" + _id);
        return false;
      }
      res.redirect("/Login");
    } catch (error) {
      console.error("An error occurred:", error);
      req.session.status = "error";
      req.session.message = "An unexpected error occurred";
      res.redirect("/MyUploads");
      return false;
    }
  });

  app.get("/MyUploads/:_id?", async (req, res) => {
    const _id = req.params._id;
    if (req.session.user) {
      const user = await User.findOne({ _id: req.session.user._id });
      var uploaded = null;
      var folderName = "";
      var fileSize = "";
      var createdAt = "";
      if (typeof _id == "undefined") {
        uploaded = user.uploaded;
      } else {
        var folderObj = await recursiveGetFolder(user.uploaded, _id);
        if (folderObj == null) {
          req.status = "error";
          req.message = "Folder not found";
          res.render("MyUploads", {
            req: req,
            uploaded: uploaded,
            _id: _id,
            folderName: folderName,
            createdAt: createdAt,
            fileSize: fileSize,
          });
          return false;
        }
        uploaded = folderObj.files;
        folderName = folderObj.folderName;
        createdAt = folderObj.createdAt;
      }
      if (uploaded == null) {
        req.status = "error";
        req.message = "Directory not found";
        res.render("MyUploads", {
          req: req,
          uploaded: uploaded,
          _id: _id,
          folderName: folderName,
          createdAt: createdAt,
          fileSize: fileSize,
        });
        return false;
      }
      res.render("MyUploads", {
        req: req,
        uploaded: uploaded,
        _id: _id,
        folderName: folderName,
        createdAt: createdAt,
        fileSize: fileSize,
      });
      return false;
    }
    res.redirect("/Login");
  });
});
