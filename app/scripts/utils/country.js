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
        prefix: '',
        mncList: []
      };
    },

    toString: function () {
      return this.get('name');
    },

    hasMccMnc: function(mcc, mnc) {
      if (this.get('mccMncNetworkList') === undefined) {
        console.log(this);
        return false
      }
      return this.get('mccMncNetworkList').filter(function(mccMncNetwork) {
        return mcc === mccMncNetwork[0] && mnc === mccMncNetwork[1]
      }).length > 0
    }
  });

  return Country;
});
