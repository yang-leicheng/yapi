import userModel from '../models/user.js'
import yapi from '../yapi.js'
import baseController from './base.js'
import mongoose from 'mongoose'

const jwt = require('jsonwebtoken');

class userController extends baseController{
    constructor(ctx){
        super(ctx)
    }
    /**
     * 添加项目分组
     * @interface /user/login
     * @method POST
     * @category user
     * @foldnumber 10
     * @param {String} username 用户名称，不能为空
     * @param  {String} password 密码，不能为空
     * @returns {Object} 
     * @example ./api/user/login.json
     */
    async login(ctx){   //登录
        let userInst = yapi.getInst(userModel); //创建user实体
        let email = ctx.request.body.email;
        let password = ctx.request.body.password;
        
        if(!email){
            return ctx.body = yapi.commons.resReturn(null,400,'email不能为空');
        }
         if(!password){
            return ctx.body = yapi.commons.resReturn(null,400,'密码不能为空');
        }

        let result = await userInst.findByEmail(email);
        
        
        if(!result){
            return ctx.body = yapi.commons.resReturn(null,404,'该用户不存在');  
        }else if(yapi.commons.generatePassword(password, result.passsalt) === result.password){ 
            let token = jwt.sign({uid: result._id},result.passsalt,{expiresIn: '7 days'});            
            ctx.cookies.set('_yapi_token', token, {
                expires: yapi.commons.expireDate(7),
                httpOnly: true
            })
            ctx.cookies.set('_yapi_uid', result._id, {
                expires: yapi.commons.expireDate(7),
                httpOnly: true
            })
            return ctx.body = yapi.commons.resReturn(null, 0, 'logout success...'); 
        }else{
            return ctx.body = yapi.commons.resReturn(null, 405, '密码错误');
        }
    }

    async logout(ctx){
        ctx.cookies.set('_yapi_token', null);
        ctx.cookies.set('_yapi_uid', null);
        ctx.body = yapi.commons.resReturn('ok');
    }



    async reg(ctx){  //注册
        var userInst = yapi.getInst(userModel); 
        let params = ctx.request.body; //获取请求的参数,检查是否存在用户名和密码
        if(!params.email){
            return ctx.body = yapi.commons.resReturn(null,400,'邮箱不能为空'); 
        }
        if(!params.password){
            return ctx.body = yapi.commons.resReturn(null,400,'密码不能为空'); 
        }
                
        var checkRepeat = await userInst.checkRepeat(params.email);//然后检查是否已经存在该用户
        if(checkRepeat>0){
            return ctx.body = yapi.commons.resReturn(null,401,'该email已经注册');
        }

        let passsalt = yapi.commons.randStr();
        let data = {
            username: params.username,
            password: yapi.commons.generatePassword(params.password, passsalt),//加密
            email: params.email,
            passsalt: passsalt,
            role: 'member',
            add_time: yapi.commons.time(),
            up_time: yapi.commons.time()
        }
        try{
            let user = await userInst.save(data);
            user = yapi.commons.fieldSelect(user,['id','username','email'])
            ctx.body = yapi.commons.resReturn(user);
            yapi.commons.sendMail({
                to: params.email,
                contents: `欢迎注册，您的账号 ${params.email} 已经注册成功`
            })
        }catch(e){
            ctx.body = yapi.commons.resReturn(null, 401, e.message);
        }
    }
    async list(ctx){  
        var userInst = yapi.getInst(userModel);
        try{
            let user = await  userInst.list();
            return ctx.body = yapi.commons.resReturn(user);
        }catch(e){
            return ctx.body = yapi.commons.resReturn(null,402,e.message);
        }
    }
    async findById(ctx){    //根据id获取用户信息
         try{             
            var userInst = yapi.getInst(userModel);
            let id = ctx.request.body.id;
            if(this.getUid() != id){
                return ctx.body = yapi.commons.resReturn(null, 402, 'Without permission.');
            }
            let result = await userInst.findById(id);
            return ctx.body = yapi.commons.resReturn(result);
        }catch(e){
            return ctx.body = yapi.commons.resReturn(null,402,e.message);
        }
    }
    async del(ctx){   //根据id删除一个用户
        try{
            if(this.getRole() !== 'admin'){
                return ctx.body = yapi.commons.resReturn(null, 402, 'Without permission.');
            }
            var userInst = yapi.getInst(userModel);
            let id = ctx.request.body.id;
            let result = await userInst.del(id);
            ctx.body = yapi.commons.resReturn(result);
        }catch(e){
            ctx.body = yapi.commons.resReturn(null,402,e.message);
        }
    }
    async update(ctx){    //更新用户信息
        try{
            var userInst = yapi.getInst(userModel);
            let id = this.getUid();
            let data ={};
            ctx.request.body.username && (data.username = ctx.request.body.username)
            ctx.request.body.email && (data.email = ctx.request.body.email)
            let result = await userInst.update(id,data);
            ctx.body = yapi.commons.resReturn(result);
        }catch(e){
            ctx.body = yapi.commons.resReturn(null,402,e.message);
        }
    }
}

module.exports = userController