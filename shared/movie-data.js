(function exposeMovieData(root, factory) {
  var api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.MoviePickerData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createMovieData() {
  'use strict';

  var POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
  var rawMovies = [
    {
      id: 'shawshank-redemption',
      name: '肖申克的救赎',
      genres: ['剧情', '犯罪'],
      doubanRating: '9.7',
      summary: '银行家安迪被冤入狱，用二十年凿开一堵墙，救赎了自己也唤醒了肖申克监狱里每一个人的希望。',
      poster: POSTER_BASE + '/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg'
    },
    {
      id: 'farewell-my-concubine',
      name: '霸王别姬',
      genres: ['剧情', '历史'],
      doubanRating: '9.6',
      summary: '两个京剧伶人跨越半个世纪的悲欢离合，时代洪流下的爱恨纠葛，不疯魔不成活。',
      poster: POSTER_BASE + '/f54hNIiHNINw3JiUJB2XaQl5wCN.jpg'
    },
    {
      id: 'forrest-gump',
      name: '阿甘正传',
      genres: ['剧情', '喜剧'],
      doubanRating: '9.5',
      summary: '智商只有75的阿甘，凭着奔跑和善良跑过了越战、乒乓外交，跑出了传奇的一生。',
      poster: POSTER_BASE + '/Cw4hIUIAmSYfK9QfaUW5igp9La.jpg'
    },
    {
      id: 'life-is-beautiful',
      name: '美丽人生',
      genres: ['喜剧', '战争'],
      doubanRating: '9.5',
      summary: '父亲在集中营用游戏和谎言保护儿子的童心，用最残酷的底色画出最温暖的父爱。',
      poster: POSTER_BASE + '/74hLDKjD5aGYOotO6esUVaeISa2.jpg'
    },
    {
      id: 'titanic',
      name: '泰坦尼克号',
      genres: ['爱情', '灾难'],
      doubanRating: '9.5',
      summary: '穷画家和贵族少女在泰坦尼克号上相遇相爱，巨轮沉没，爱情却成为永恒。',
      poster: POSTER_BASE + '/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg'
    },
    {
      id: 'interstellar',
      name: '星际穿越',
      genres: ['科幻', '冒险'],
      doubanRating: '9.4',
      summary: '一组宇航员穿越虫洞，为濒死的人类寻找新家园。时间和引力可以弯曲，唯有父女之爱穿越一切维度。',
      poster: POSTER_BASE + '/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg'
    },
    {
      id: 'spirited-away',
      name: '千与千寻',
      genres: ['动画', '奇幻'],
      doubanRating: '9.4',
      summary: '女孩千寻误入神灵世界，为救父母在汤屋打工。宫崎骏创造一个奇幻又温暖的神隐之旅。',
      poster: POSTER_BASE + '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg'
    },
    {
      id: 'inception',
      name: '盗梦空间',
      genres: ['科幻', '悬疑'],
      doubanRating: '9.4',
      summary: '潜入他人梦境窃取秘密，层层嵌套的梦中梦。一只陀螺旋转不停，现实与梦境究竟谁真谁假？',
      poster: POSTER_BASE + '/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg'
    },
    {
      id: 'leon-the-professional',
      name: '这个杀手不太冷',
      genres: ['动作', '剧情'],
      doubanRating: '9.4',
      summary: '孤独的职业杀手和失去家人的小女孩相依为命。冷酷外表下藏着一颗最温柔的心。',
      poster: POSTER_BASE + '/bxB2q91nKYp8JNzqE7t7TWBVupB.jpg'
    },
    {
      id: 'schindlers-list',
      name: '辛德勒的名单',
      genres: ['历史', '战争'],
      doubanRating: '9.5',
      summary: '德国商人辛德勒倾尽家财，从纳粹魔爪下救出1100名犹太人的生命。拯救一人，即拯救全世界。',
      poster: POSTER_BASE + '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg'
    },
    {
      id: 'the-truman-show',
      name: '楚门的世界',
      genres: ['剧情', '喜剧'],
      doubanRating: '9.3',
      summary: '从出生起就活在真人秀中的男人，终于发现头顶的蓝天是一面巨大的幕布。他选择走出去。',
      poster: POSTER_BASE + '/vuza0WqY239yBXOadKlGwJsZJFE.jpg'
    },
    {
      id: 'three-idiots',
      name: '三傻大闹宝莱坞',
      genres: ['喜剧', '剧情'],
      doubanRating: '9.2',
      summary: '三个工科大学生的校园故事，用笑声讽刺应试教育，追问什么是真正的学习和成功。',
      poster: POSTER_BASE + '/66A9MqXOyVFCssoloscw79z8Tew.jpg'
    },
    {
      id: 'wall-e',
      name: '机器人总动员',
      genres: ['动画', '科幻'],
      doubanRating: '9.3',
      summary: '被遗弃在地球的小机器人瓦力，默默清扫垃圾700年，直到遇见来寻找生命迹象的伊芙。',
      poster: POSTER_BASE + '/hbhFnRzzg6ZDmm8YAmxBnQpQIPh.jpg'
    },
    {
      id: 'a-chinese-odyssey-part-two',
      name: '大话西游之大圣娶亲',
      genres: ['喜剧', '奇幻'],
      doubanRating: '9.2',
      summary: '至尊宝戴上金箍变成孙悟空的那一天，终于懂了什么是爱。我的意中人是个盖世英雄。',
      poster: POSTER_BASE + '/ksloRonL1kOq4yErf9LOJ5qDhem.jpg'
    },
    {
      id: 'the-silence-of-the-lambs',
      name: '沉默的羔羊',
      genres: ['恐怖', '惊悚'],
      doubanRating: '9.0',
      summary: '年轻FBI探员为追查连环杀手求助食人魔汉尼拔。一场心理博弈，恐惧与智慧的交锋。',
      poster: POSTER_BASE + '/uS9m8OBk1A8eM9I042bx8XXpqAq.jpg'
    }
  ];

  var movies = rawMovies.map(function freezeMovie(movie) {
    return Object.freeze({
      id: movie.id,
      name: movie.name,
      genres: Object.freeze(movie.genres.slice()),
      doubanRating: movie.doubanRating,
      summary: movie.summary,
      poster: movie.poster
    });
  });

  return Object.freeze({
    POSTER_BASE: POSTER_BASE,
    movies: Object.freeze(movies)
  });
});
