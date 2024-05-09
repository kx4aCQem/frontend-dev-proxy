// export config for `frontend-dev-proxy`
module.exports = {
  "htmlSearchReplace":
      [
        {
          "regex": /"\s*?\/etc.clientlibs\/motorcycle\/frontend\/([-\w]+)(?:\.lc-[0-9a-z]{32}-lc)?(?:\.min)?/g,
          "replace": '"/$1/$1'
        },
        {
          "urlStartsWith": '/sites.html/content/websites/gasgas-com',
          "regex": /Adobe Experience Manager/g,
          "replace": 'Alex Experience Mgr'
        },
        {
          "urlStartsWith": '/content/websites/',
          "regex": /<h1 class=" title--primary">(.*)<\/h1>/sg,
          "replace": '<h1 class=" title--primary">Proxy: $1 :End:</h1>'
        },
      ]
  };
