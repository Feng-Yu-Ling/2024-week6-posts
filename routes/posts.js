var express = require('express');
// 建立一個新的路由object來處理路由
var router = express.Router();
const appError = require("../service/appError");
const handleErrorAsync = require("../service/handleErrorAsync");
//模組化的Post model，習慣上model會用大寫
const Post = require("../models/postsModel");
//模組化的User model，習慣上model會用大寫
const User = require("../models/usersModel");
const {isAuth, generateSendJWT} = require("../service/auth");



/*
Post.find()查詢所有document，
對每個查詢結果透過populate()填充關聯的user資訊。
當populate()方法被調用時，
Mongoose將尋找"user"欄位中的每個ObjectId，
然後在"User" model中搜尋對應的document。
select表示只回傳所需的欄位（"name"和"photo"）
*/

// 設置路由器以取得該user的所有貼文
router.get('/', isAuth, handleErrorAsync(
  async function(req, res, next){
    const userId = req.user.id;
    // 依照時間戳排序以及content欄位的關鍵字搜尋
    const timeSort = req.query.timeSort == "asc" ? "createdAt":"-createdAt";
    const q = req.query.q !== undefined ? {"content": new RegExp(req.query.q)} : {};
    // 等待資料庫回傳結果，因為這是一個異步操作，會返回promise，所以需要加await
    // 透過Object.assign()將q添加user的屬性以便只返回該user的貼文
    const posts = await Post.find(Object.assign(q,{"user": userId})).populate({
      // path指向要填充(populate)的欄位為"user"
      path: "user",
      // select表示關聯查詢後要顯示的欄位為"name"及"photo"
      select: "name photo"
    }).sort(timeSort);
    // asc 遞增(由小到大，由舊到新) createdAt ; 
    // desc 遞減(由大到小、由新到舊) "-createdAt";
    // 在express若不指定狀態碼，預設是200，所以可以省略status(200)
    res.json({
      posts
  })
  }
));


// 設置路由器以新增該user的一筆貼文
router.post("/", isAuth, handleErrorAsync(
  async function(req, res, next){
    const { content } = req.body;
    if(content == undefined){
      /* next()會進到下一個程式堆疊，
      若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
      return next(appError(400, "你沒有填寫 content 資料", next))
    }
    const newPost = await Post.create({
      user: req.user.id,
      // Property Shorthand: 當object的屬性名和變數名相同時，可以只寫一次屬性名，讓程式碼更簡潔
      content
    });
    res.status(201).json({
      status:"success",
      post: newPost
    })
  }
))


// 設置路由器以刪除該user的所有貼文
router.delete('/', isAuth, handleErrorAsync(
  async function(req, res, next){
    // 使用req.originalUrl確保不是無意中匹配到此路由，記得要寫完整路由
    if(req.originalUrl === "/posts"){
      const userId = req.user.id;
      // 等待資料庫刪除完成，因為這是一個異步操作，會返回promise，所以需要加await
      await Post.deleteMany({"user": userId});
      const posts = await Post.find({"user": userId});
      // 在express若不指定狀態碼，預設是200，所以可以省略status(200)
      res.json({
          "status":"success",
          posts
      })
    }
    else{
      /* next()會進到下一個程式堆疊，
      若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
      return next(appError(400, "刪除全部的路由為'posts'而不是'posts/'，這是避免刪除單筆的錯誤操作"))
    }
  }
));


// 設置路由器以刪除一筆貼文
router.delete('/:id', isAuth, handleErrorAsync(
  async function(req, res, next){
    const id = req.params.id;
    const userId = req.user.id;
      // 等待資料庫刪除完成，因為這是一個異步操作，會返回promise，所以需要加await
      const searchResult = await Post.findById(id);
      
      if(!searchResult){
          /* next()會進到下一個程式堆疊，
          若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
          next(appError(404, "無此 post ID"))
      }
      // ObjectId需轉換為字串才能與userId字串進行比較
      else if(searchResult.user.toString() !== userId){
          /* next()會進到下一個程式堆疊，
          若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
          next(appError(400, "此 post ID並非屬於你！"))
      }
      else{
          await Post.findByIdAndDelete(id);
          // 在express若不指定狀態碼，預設是200，所以可以省略status(200)
          res.json({
              "status":"success",
              data:null
          })
      }
  }
));


// 設置路由器以更新一筆貼文
router.patch('/:id', isAuth, handleErrorAsync(
  async function(req, res, next){
    const data = req.body;
      const id = req.params.id;
      const userId = req.user.id;

      // 等待資料庫刪除完成，因為這是一個異步操作，會返回promise，所以需要加await
      const searchResult = await Post.findById(id);

      if(!searchResult){
          /* next()會進到下一個程式堆疊，
          若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
          next(appError(404, "無此 post ID"))
      }
      // ObjectId需轉換為字串才能與userId字串進行比較
      else if(searchResult.user.toString() !== userId){
        /* next()會進到下一個程式堆疊，
        若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
        next(appError(400, "此 post ID並非屬於你！"))
      }
      else{
          // 等待資料庫更新資料，因為這是一個異步操作，會返回promise，所以需要加await
          // 在findByIdAndUpdate()加入第三個參數 {runValidators:true}讓它也執行Schema驗證
          // 在findByIdAndUpdate()加入第三個參數 {new:true}讓他回傳更新後的document而不是原始document
          const updatePost = await Post.findByIdAndUpdate(id, data, {runValidators:true, new:true});
          // 在express若不指定狀態碼，預設是200，所以可以省略status(200)
          res.json({
              "status":"success",
              updatePost
          })
      }
  }
));

module.exports = router;
