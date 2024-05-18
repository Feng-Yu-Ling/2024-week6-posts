const jwt = require("jsonwebtoken");
const appError = require("./appError");
const handleErrorAsync = require("./handleErrorAsync");
const express = require("express");
const User = require("../models/usersModel");

const isAuth = handleErrorAsync(async(req, res, next)=>{
    // 確認token是否存在
    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith("Bearer")){
      token = req.headers.authorization.split(" ")[1];
    }
    if(!token){
      return next(appError("401", "你尚未登入！", next));
    }
  
    // 驗證toekn正確性
    const decoded = await new Promise((resolve, reject)=>{
      jwt.verify(token, process.env.JWT_SECRET, (err, payload)=>{
        if(err){
          reject(err)
        }
        else{
          resolve(payload)
        }
      });
    })

    const currentUser = await User.findById(decoded.id);
    // 將currentUser儲存到req.user，以便後續的middleware和路由處理函式能夠訪問
    req.user = currentUser;
    next();
  });

  const generateSendJWT = (user, statusCode, res)=>{
    // 產生JWT token
    const token = jwt.sign({id:user._id}, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_DAY});
      // 把password清掉
      user.password = undefined;
      res.status(statusCode).json({
        status: "success",
        user:{
          token,
          name: user.name
        }
      });
  }

  module.exports = {
    isAuth,
    generateSendJWT
  }