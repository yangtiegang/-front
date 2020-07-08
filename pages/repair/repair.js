// pages/repair/repair.js
var QQMapWX = require('../../libs/qqmap-wx-jssdk.min.js');
var qqmapsdk;
Page({

  /**
   * 页面的初始数据
   */
  data: {
    bikeNo:'',
    types:[]
  },
  checkboxChange: function (e) {
    var values = e.detail.value;   //当前选的那个值
    console.log("选择的故障:"+values);
    this.setData({
      types: values
    })
  },
   //扫码
   scanCode:function(e){
    var that=this;
 //扫码功能
     //用软件生成一个测试二维码: www.liantu.com
     // 比如:  http://localhost:8080/00000001
     //请注意:上线后，微信要求访问的协议必须是 https
     //且不能有端口号( 即https 443)
     wx.scanCode({
      success:function(r){
        var code=r.result;
        console.log( "要报修的单车码:"+code );
        that.setData({
          bikeNo:code
        })
      }
    });
  },
   // 提交到服务器
   formSubmit: function (e) {   //表单事件对象
    var that=this;
    var bikeNo = e.detail.value.bikeNo;
    //也可以
    //var bikeNo=this.data.bikeNo;
    var types = this.data.types;
    var globalData = getApp().globalData;
    var phoneNum = globalData.phoneNum;
    var openid=wx.getStorageSync('openid');
    wx.getLocation({
      success:function(res){
        var latitude=res.latitude;
        var longitude=res.longitude;
        //1.向业务系统发生请求，将车辆状态置位报修
        report(  that,bikeNo,types ,phoneNum, openid,latitude, longitude   );
        //TODO: 2.向日志系统记录log

      }
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
  // 实例化API核心类
  qqmapsdk = new QQMapWX({
    key: 'AGMBZ-263RP-JQUD5-LK2XE-675FT-Y2FDA'
});
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})
function report(  that,bikeNo,types,phoneNum,openid, latitude,longitude   ){
  wx.request({
    url: "http://localhost:9090/bike/repair",
    header: { 'content-type': 'application/x-www-form-urlencoded' },
    data: {
      phoneNum: phoneNum,
      bid: bikeNo,
      types: types,
      openid:openid,
      latitude:latitude,
      longitude:longitude
    },
    method: 'POST',
    success: function (res) {
      console.log( res );
      repairLog(phoneNum,bikeNo,types,openid);
      if( res.data.code==1){
        wx.showToast({
          title: '报修成功...谢谢',
        });
        wx.navigateTo({
            url: '../index/index',
      });
      }
    }
  })
}

function repairLog(phoneNum,bikeNo,types,openid){
  wx.getLocation({
    success:function(res){
      var lat=res.latitude;
      var log=res.longitude;
      console.log(lat +" "+log);
      qqmapsdk.reverseGeocoder({
        location:{
          latitude:lat,
          longitude:log
        },
        success:function(res){
          console.log("腾讯地图的结果："+res);
          var address=res.result.address_component;
          var province=address.province;
          var city=address.city;
          var district=address.district;
          var street=address.street;
          var street_number=address.street_number;
          var dt=new Date();
          var reportTime=Date.parse(dt);
         console.log(province+" "+city+" "+district+" "+street+" "+street_number);
         wx.request({
           url: 'http://localhost:9090/bike/log/addRepairLog',
           data:{
             uuid:wx.getStorageSync('uuid'),
             openid:openid,
             phoneNum:phoneNum,
             bikeNo:bikeNo,
             reportTime:reportTime,
             types:types,
             lat:lat,
             log:log,
             province:province,
             city:city,
             district:district,
             street:street,
             street_number:street_number,
             repairMan:"",
             repairTime:"",
           },
           method:"POST"
         })
        }
      })
    }
  })
}