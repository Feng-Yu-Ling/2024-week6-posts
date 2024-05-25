const express = require('express');
// 建立一個新的路由object來處理路由
const bcrypt = require('bcryptjs');
const appError = require('../service/appError');
const jwt = require('jsonwebtoken');
const handleErrorAsync = require('../service/handleErrorAsync');
const validator = require('validator');
const User = require('../models/usersModel');
const {isAuth, generateSendJWT} = require("../service/auth");
const router = express.Router();



// 動資料庫是昂貴的，先寫防呆機制
router.post("/sign_up", handleErrorAsync(async(req, res, next)=>{
  let {email, password, confirmPassword, name} = req.body;
  // 內容不可為空
  if(!email || !password || !confirmPassword || !name){
    /* next()會進到下一個程式堆疊，
    若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
    return next(appError("400", "欄位未填寫正確", next));
  }
  // 密碼不正確
  if(password!==confirmPassword){
    /* next()會進到下一個程式堆疊，
    若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
    return next(appError("400", "密碼不一致", next));
  }
  // 密碼不少於8碼
  if(!validator.isLength(password, {min: 8})){
    /* next()會進到下一個程式堆疊，
    若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
    return next(appError("400", "密碼字數低於8碼", next));
  }
  // 密碼必須為英數混合
  if(password){
    // validator並沒有提供英數混合的檢查，所以透過正則表達式實現
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if(!hasLetter || !hasNumber){
      /* next()會進到下一個程式堆疊，
      若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
      return next(appError("400", "密碼必須為英數混合", next));
    }
  }

  // 名字不少於2個字元
  if(!validator.isLength(name, {min: 2})){
    /* next()會進到下一個程式堆疊，
    若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
    return next(appError("400", "名字不能少於2個字元", next));
  }
  
  // 是否為Email
  if(!validator.isEmail(email)){
    /* next()會進到下一個程式堆疊，
    若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
    return next(appError("400", "Email格式不正確", next));
  }
  // findOne()是非同步方法，需要等待結果才能確定是否有找到相同email
  if(await User.findOne({email})){
    return next(appError("400", "此Email已註冊過", next));
  }

  // 加密密碼
  password = await bcrypt.hash(req.body.password, 12);
  // Property Shorthand: 當object的屬性名和變數名相同時，可以只寫一次屬性名，讓程式碼更簡潔
  const newUser = await User.create({
    email,
    password,
    name
  });
  // 將res帶到generateSendJWT函式
  generateSendJWT(newUser,201,res);
}))


router.post("/sign_in", handleErrorAsync(async(req, res, next)=>{
  const {email, password} = req.body;
  if(!email || !password){
    /* next()會進到下一個程式堆疊，
    若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
    return next(appError("400", "帳號密碼不可為空", next))
  }
  // select()用於查詢時須返回哪些欄位，選擇包含("+")或排除("-")特定欄位
  const user = await User.findOne({email}).select("+password");
  // 查詢不到此email
  if(!user){
    /* next()會進到下一個程式堆疊，
    若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
    return next(appError("400", "查詢不到此email", next))
  }
  const auth = await bcrypt.compare(password, user.password);
  // 密碼不正確
  if(!auth){
    /* next()會進到下一個程式堆疊，
    若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
    return next(appError("400", "您的密碼不正確", next))
  }
  // 將res帶到generateSendJWT函式
  generateSendJWT(user, 200, res);
}))





router.get("/profile/", isAuth, handleErrorAsync(async(req, res, next)=>{
  res.status(200).json({
    status: "success",
    user: req.user
  });
}))


router.patch("/profile/", isAuth, handleErrorAsync(async(req, res, next)=>{
  let { name } = req.body;
  const id = req.user.id;
  // 內容不可為空
  if(!name){
    /* next()會進到下一個程式堆疊，
    若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
    return next(appError("400", "欄位未填寫正確", next));
  };
  // 即使只更新一個欄位，也必須將它包裹在大括號
  const updateName = await User.findByIdAndUpdate(id, {name: name}, {runValidators:true, new:true});
  res.json({
    "status":"success",
    updateName
  })
}))

router.post("/updatePassword", isAuth, handleErrorAsync(async(req, res, next)=>{
  const {password, confirmPassword} = req.body;
  if(password !== confirmPassword){
    /* next()會進到下一個程式堆疊，
    若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
    return next(appError("400", "密碼不一致！", next));
  }
  // 密碼不少於8碼
  if(!validator.isLength(password, {min: 8})){
    /* next()會進到下一個程式堆疊，
    若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
    return next(appError("400", "密碼字數低於8碼", next));
  }
  // 密碼必須為英數混合
  if(password){
    // validator並沒有提供英數混合的檢查，所以透過正則表達式實現
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if(!hasLetter || !hasNumber){
      /* next()會進到下一個程式堆疊，
      若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
      return next(appError("400", "密碼必須為英數混合", next));
    }
  }
  const newPassword = await bcrypt.hash(password, 12);

  const user = await User.findByIdAndUpdate(req.user.id, {
    password: newPassword
  });
  // 將res帶到generateSendJWT函式
  generateSendJWT(user, 200, res)
}))

module.exports = router;
