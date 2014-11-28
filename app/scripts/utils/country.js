define([
  'backbone'
], function (Backbone) {
  'use strict';

  var Country = Backbone.Model.extend({
    defaults: function () {
      return {
        mccMncNetworkList: [],
        code: '',
        name: '',
        prefix: ''
      };
    },

    toString: function () {
      return this.get('name');
    },

    hasMccMnc: function(mcc, mnc) {
      return this.mccMncNetworkList.filter(function(mccMncNetwork) {
        return mcc === mccMncNetwork[0] && mnc === mccMncNetwork[1]
      }).length > 0
    }
  });

  return Country;
});
