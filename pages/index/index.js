// pages/register/reg.js
var QQMapWX = require('../../libs/qqmap-wx-jssdk.min.js');
var qqmapsdk;
Page({

  /**
   * 页面的初始数据
   */
  data: {
    latitude:0,
    longitude:0,
    contollers:[],
    markers:[]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    qqmapsdk = new QQMapWX({
      key: 'AGMBZ-263RP-JQUD5-LK2XE-675FT-Y2FDA'
      });
      console.log("生命周期->onLoad")
      //获取当前对象的拷贝
      var that=this;
      //创建一个地图上下文,对地图中的控件进行操作
      that.mapCtx=wx.createMapContext('map');
      //3.获取当前手机所在的位置(真机是手机真实位置  模拟器则是在sensor面板中设置)
      wx.getLocation({
        type: 'wgs84',
        isHighAccuracy:"true",
        success:function(res){
          that.setData({
              latitude:res.latitude,
              longitude:res.longitude
          });
         
        }
      });
      //加载所有的可用的附近的前10辆车
      //获取附的车并显示
      findNearBikes(that,that.data.latitude,that.data.longitude);
      //4.在地图中加入按钮
      //获取当前设备信息  屏幕的宽高
      wx.getSystemInfo({
        success: function(res)  {
            //获取宽高
            var height=res.windowHeight;
            var width=res.windowWidth;
            //添加控件
            that.setData({
              controls:[{
                id:1,
                position:{
                  left:width/2-10,
                  top:height/2-10,
                  width:20,
                  height:35
                },
                iconPath:"../images/location.png",
                clickable:true
              },
             { id:2,
              position:{
                left:20,
                top:height-60,
                width:40,
                height:40
              },
              iconPath:"../images/img1.png",
              clickable:true
            },
            {id:3,
            position:{
              left:100,
              top:height-60,
              width:100,
              height:40
            },
            iconPath:"../images/qrcode.png",
            clickable:true
          }, 
          {id:4,
            position:{
              left:width-45,
              top:height-60,
              width:40,
              height:40
            },
            iconPath:"../images/pay.png",
            clickable:true
          },{id:6,
            position:{
              left:width-42,
              top:height-203,
              width:35,
              height:35
            },
            iconPath:"../images/repair.png",
            clickable:true
          }
            ]
            })
        }
      })

  },
  controltap(e){
    var that=this;
    if(e.controlId==2){
      //复位
      that.mapCtx.moveToLocation();
    }else if(e.controlId==4){
        wx.navigateTo({
          url: '../pay/pay',
        })
    }else if(e.controlId==6){
      //TODO以后加入必须登录用户才能保修


      wx.navigateTo({
        url: '../repair/repair',
      })
  }else if(e.controlId==3){
        //获取全局变量status,根据它的值进行页面跳转
        //var status=getApp().globalData.status;
        var status=wx.getStorageSync('status' )
        console.log(status);
        if( status==0){
        //跳到注册页面
        wx.navigateTo({
          url: '../register/register',
        });
      }else if (status == 1) {
        wx.navigateTo({
          url: '../deposit/deposit',
        });
      } else if (status == 2) {
        wx.navigateTo({
          url: '../identity/identity',
        });
      } else if (status == 3) {
        that.scanCode();
      }else if(status==4){
        wx.navigateTo({
          url: '../billing/billing',
        }); 
      }
    }
  },
scanCode:function () {

  var that=this;
  wx.scanCode({
    success:function(res){
      console.log(res);
      //得到车的编号
      var bid=res.result;
      //异步请求
      wx.request({
        url: "http://localhost:9090/bike/open",
        method:"POST",
        // data:"bid="+bid+"&latitude="+latitude+"&longitude="+longitude,
        data:{
          bid:bid,
          latitude:that.data.latitude,
          longitude:that.data.longitude
        },
        dataType:"json",
        header:{
          "content-type":"application/json"
        },
        success:function(res){
          if(res.data.code==0){
            wx.showToast({
              title: '开锁失败,原因：'+res.data.msg,
              icon:"none"
            });
            return
          }
          //TODO 计费 计时
          console.log(res.data);
          if(res.data.code==1){
            
            //在本地存一下正在骑行的单车号
            wx.setStorageSync('bid',bid);
            wx.setStorageSync('status', 4);//表示当前用户正在骑行中
            wx.setStorageSync('start_log',that.data.longitude);
            wx.setStorageSync('start_lat', that.data.latitude);
            qqmapsdk.reverseGeocoder({
              location:{
                latitude:that.data.latitude,
                longitude:that.data.longitude
              },
              success:function(res){
                var address=res.result.address_component;
                var startDistrict=address.district;
                wx.setStorageSync('startDistrict', startDistrict);
                var startStreet=address.street;
                wx.setStorageSync('startStreet', startStreet);
                var startStreet_number=address.street_number;
                wx.setStorageSync('startStreet_number', startStreet_number);
              }
            })
            wx.navigateTo({
              url: '../billing/billing'
            });
          }
        }
      });
    }
  });
 },
  regionchange:function( e ){
    var that =this;
   // e的事件type也两种值  begin，和 end
   if(  e.type=='end'){
    //要取出当前的位置，但请注意，这里不能用 wx.getLocation,因为它取的是设备的位置，这里要是移动后的地图位置. 
    that.mapCtx.getCenterLocation({
      success:function( res ){
        //这时的经纬度为地图新位置的中心点的经纬度
        findNearBikes(that,res.latitude, res.longitude);
      }
    });
  }
}
})
function findNearBikes(that,latitude,longitude){
  wx.request({
    url: "http://localhost:9090/bike/findNearAll",
    method:"POST",
    data:{
      latitude:latitude,
      longitude:longitude,
      status:1
    },
    success:function(res){
      const bikes=res.data.obj.map(item=>{
        return {
          id:item.bid,
          bid:item.bid,
          iconPath:"../images/bike.png",
          width:35,
          height:35,
          latitude:item.latitude,
          longitude:item.longitude
        }
      });
      console.log(bikes);
      that.setData({
        markers:bikes
      });
     
    }
  })
}