define([
  'backbone',
  'zeptojs',
  'global',
  'templates',
  'utils/phonenumber',
  'utils/language'
], function (Backbone, $, global, templates, PhoneNumber, Language) {
  'use strict';

  var CALL_ME_TIMEOUT = 3 * 60 * 1000; // time until call me button is enabled
                                       // in milliseconds
  var PROGRESSBAR_UPDATE_TIME = 10; // how often to update the progress bar
                                    // in milliseconds

  var Validate = Backbone.View.extend({

    el: '#main-page',

    template: templates.validate,

    initialize: function(options) {
      this.phoneNumber = options.phoneNumber;
      this.countryCode = options.countryCode;
      this.mcc = options.mcc;
      this.mnc = options.mnc;
    },

    render: function () {
      var internationalNumber,
        fullNumber = this.countryCode + this.phoneNumber,
        _this = this,
        startTime = parseInt(localStorage.getItem('smsSendTime') || '0', 10),
        updateTimer = function () {
          var currentTime = (new Date()).getTime(),
            passedTime = currentTime - startTime,
            passedPercent = passedTime / CALL_ME_TIMEOUT * 100;
          if (passedPercent < 100) {
            _this.$el.find('#call-me-progress').attr('value', passedPercent);
          } else {
            window.clearInterval(_this.updateTimerInterval);
            _this.$el.find('#call-me-progress').attr('value', 100);
            _this.$el.find('#call-me-button').removeAttr('disabled');
          }
        };
      this.$el.removeClass().addClass('page validate');
      try {
        internationalNumber = PhoneNumber.format(fullNumber);
      } catch (e) {
        internationalNumber = fullNumber;
      }
      this.$el.html(this.template({ phoneNumber: internationalNumber }));

      window.clearInterval(this.updateTimerInterval);
      this.updateTimerInterval = window.setInterval(
        updateTimer, PROGRESSBAR_UPDATE_TIME);
      updateTimer(); //startTime may be way off
    },

    events: {
      'submit #validate-form':               'validate',
      'click #reenter-phone-button':         'goToLogin',
      'click #call-me-button':               'callMe',
      'keyup input[name=validation-code-1]': 'checkPinInput',
      'keyup input[name=validation-code-2]': 'checkPinInput'
    },

    // Validate page functions

    callMe: function (evt) {
      evt.preventDefault();
      // TODO: put right locale here
      var locale = Language.getLanguage().replace(/\-.*$/, ''),
        _this = this,
        l10n = global.localisation[global.language];
      global.auth.register(this.countryCode, this.phoneNumber, locale, this.mcc,
        this.mnc, 'voice', function(err, details) {
          if (err) {
            window.alert(global.auth.getRegisterErrorString(
              err, details, l10n, global.l10nUtils.interpolate
            ));
          } else {
            var needsValidation = details;
            if (!needsValidation) {
              var destination = global.auth.get('screenName') ?
                'inbox' : 'profile';
              global.router.navigate(destination, { trigger: true });
            }
            else {
              var stringId = 'callRequested';
              _this.$el.find('#call-me-button').
                html(l10n[stringId]).attr('disabled', 'true');
            }
          }
        });
    },

    checkPinInput: function (evt) {
      evt.preventDefault();
      var code1 = $('input[name=validation-code-1]').val();
      var code2 = $('input[name=validation-code-2]').val();
      var button = $(evt.target).closest('form').find('input[type=submit]');
      button.prop('disabled', code1.length < 3 || code2.length < 3);
    },

    checkNameInput: function (evt) {
      evt.preventDefault();
      var name = $(evt.target).val();
      var button = $(evt.target).closest('form').find('input[type=submit]');
      button.prop('disabled', name.length < 4);
    },

    goToLogin: function (evt) {
      evt.preventDefault();
      global.router.navigate('login', { trigger: true });
    },

    validate: function (evt) {
      var _this = this;
      evt.preventDefault();

      var pin = this.$el.find('input[name=validation-code-1]').val() +
                this.$el.find('input[name=validation-code-2]').val();

      this.showSpinner('validate-page');

      global.auth.validate(
        this.countryCode, this.phoneNumber, pin, '',
        function (err) {
          _this.hideSpinner('validate-page');
          if (err) {
            window.alert(global.localisation[global.language].pinInvalidAlert);
            return;
          }
          var destination = global.auth.get('screenName') ?
                            'inbox' : 'profile';
          global.router.navigate(destination, { trigger: true });
        }
      );
    },

    showSpinner: function (section) {
      var $section = this.$el.find('#' + section);

      $section.find('.spinner').show();
      $section.find('section.intro > p').hide();
      var button = $section.find('input[type=submit]');
      button.prop('disabled', true);
    },

    hideSpinner: function (section) {
      var $section = this.$el.find('#' + section);

      $section.find('.spinner').hide();
      $section.find('section.intro > p').show();
      var button = $section.find('input[type=submit]');
      button.prop('disabled', false);
    }
  });

  return Validate;
});
