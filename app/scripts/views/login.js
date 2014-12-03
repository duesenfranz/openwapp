define([
  'backbone',
  'zeptojs',
  'global',
  'templates',
  'utils/phonenumber',
  'collections/countries'
], function (Backbone, $, global, templates, PhoneNumber, CountriesCollection) {
  'use strict';

  var localStorage = window.localStorage;

  var Login = Backbone.View.extend({

    el: '#main-page',

    template: templates.login,

    previousPages: [],

    currentPage: 'init',

    /***********************GENERAL*************************************/

    initialize: function () {
      console.log('called init');
      this.mcc = '';
      this.mnc = '';
      this.possibleSimCards = []; //only relevant if multiple sims found
      this.selectedSimCard = null;
      this.proposedCountry = null;
      this.countryTables = new CountriesCollection();
      this.readSimCards();
      this.elements = {};
    },

    events: {
      'submit #register':            'gotoConfirmation',
      'submit #register-conf':       'register',
      'submit #register-network':    'networkSelected',
      'click  #validate-button':     'goToValidate',
      'click  .icon-back':           'back',
      'blur   #country-select':      'setCountryPrefix',
      'blur   #sim-select' :         'setSimCard',
      'blur   #carrier-select':      'setCarrier',
      'blur   #mcc-mnc-select':      'setNetwork',
      'change #number-input':        'checkValidRegister',
      'click  #sim-choose':          'showSimSelect',
      'click  #country-choose':      'showCountrySelect',
      'click  #carrier-choose':      'showCarrierSelect',
      'click  #network-choose':      'showNetworkSelect',
      'click  .tos a':               'showTOS'
    },

    render: function () {
      if (global.updateNeeded) {
        console.log('Old app version. Need to update');
        this.$el.html(templates.updateNeeded);
      } else {
        var message, stringId;
        var l10n = global.localisation[global.language];

        if (this.possibleSimCards.length === 0) {
          stringId = 'countryNotDetectedOnLogin';
          message = l10n[stringId];
        }
        else if (this.possibleSimCards.length === 1) {
          var interpolate = global.l10nUtils.interpolate;
          stringId = 'countryDetectedOnLogin';
          message = interpolate(l10n[stringId], {
            country: this.countryTables.getCountryByMccMnc(
              this.selectedSimCard.mcc, this.selectedSimCard.mnc)
          });
        } else {
          stringId = 'multipleSimCards';
          message = l10n[stringId];
        }
        console.log(message);
        var el = this.template({
          countryDetectionMessage: message
        });
        this.$el.html(el);
        this.populateElements();
        this.populateCountryNames();
        this.populateSimCards();
        this.checkValidRegister();
        this.$el.removeClass().addClass('page init');
      }
    },

    populateElements: function () {
      console.log('populating elements');
      var _this = this,
        e = function(selector) {
          return _this.$el.find(selector);
        };
      this.elements = {
        sim: {
          choose: e('#sim-choose'),
          select: e('#sim-select')
        },
        country: {
          choose: e('#country-choose'),
          select: e('#country-select')
        },
        carrier: {
          choose: e('#carrier-choose'),
          select: e('#carrier-select')
        },
        network: {
          choose: e('#network-choose'),
          select: e('#network-select')
        },
        submits: {
          init: e('#register .submit'),
          network: e('#network-submit')
        },
        forms: {
          init: e('#register'),
          network: e('#register-network'),
          confirm: e('#register-conf')
        },
        numberInput: e('#register input')
      };
    },

    readSimCards: function () {
      /*
       * Reads the sim cards out and populates ``this.possibleSimCards``
       * with a list of {mnc: {mnc}, mcc: {mcc}, slotNr: {slotNr}}
       * slotNr starts at 1
       */
      var SimCardList = (
          // < 1.3
          (navigator.mozMobileConnection && [navigator.mozMobileConnection]) ||
            // >= 1.3; this isn't really an array but an iterable
          (navigator.mozMobileConnections &&
            Array.from(navigator.mozMobileConnections))||
            // simulator
          []
      );
      this.possibleSimCards = SimCardList.
          map(function(sim, index) {
            console.log(sim, index);
            var network = (sim.lastKnownHomeNetwork ||
                           sim.lastKnownNetwork || '-').
                            split('-');
            console.log(network);
            return {
              slotNr: index + 1,
              mcc: network[0],
              mnc: network[1]
            };
          }).
          filter(function(sim) {
            return sim.mcc && sim.mnc;
          });
      console.log("Possible sim cards", this.possibleSimCards);
    },

    next: function (nextPage) {
      this.previousPages.push(this.currentPage);
      this.$el.removeClass().addClass('page').addClass(nextPage);
      this.currentPage = nextPage;
    },

    back: function (evt) {
      evt.preventDefault();
      var previous = this.previousPages[this.previousPages.length - 1];
      this.$el.removeClass().addClass('page').addClass(previous);
      this.currentPage = previous;
      this.previousPages.pop(this.previousPages.length - 1);
    },

    /**********************PAGE 1 - INIT********************************/


    checkValidRegister: function() {
      var isValid = this.elements.numberInput.val() && this.proposedCountry;
      if (isValid) {
        this.elements.submits.init.removeAttr('disabled');
      } else {
        this.elements.submits.init.attr('disabled', true);
      }
      return isValid;
    },

    populateSimCards: function () {
      /*
       * Populates the sim card select and disables everything else - the sim
       * card should be selected first & selecting the sim card possibly the
       * country prefix automatically.
       */
      if (this.possibleSimCards.length < 2) {
        if (this.possibleSimCards.length === 1) {
          this.selectedSimCard = this.possibleSimCards[0];
        }
        return;
      }
      var _this = this;
      this.possibleSimCards.map(function(sim, index) {
        console.log(_this.countryTables);
        var country = _this.countryTables.getCountryByMccMnc(sim.mcc, sim.mnc),
          carrier = country.getCarrier(sim.mcc, sim.mnc);
        _this.elements.sim.select.append(new Option(
          'Slot ' + sim.index + ': ' + carrier, index
        ));
      });
      this.sim.choose.removeClass('hidden');
      this.submits.init.attr('disabled', true);
      this.numberInput.attr('disabled', true);
      this.country.choose.removeClass('action');
    },

    populateCountryNames: function () {
      var _this = this;
      this.countryTables.forEach(function (country) {
        var isSim = _this.selectedSimCard && country.hasMccMnc(
            _this.selectedSimCard.mcc, _this.selectedSimCard.mnc
          );
        _this.elements.country.select.append(
          new Option(country.toString(), country.get('code'), true, isSim)
        );
        if (isSim) {
          _this.elements.country.choose.html(country.get('prefix'));
          _this.proposedCountry = country;
        }
      });
    },

    setSimCard: function(evt) {
      var simNumber = $(evt.target).val(),
        simCard = this.possibleSimCards[simNumber],
        country = this.countryTables.getCountryByMccMnc(
          simCard.mcc, simCard.mnc),
        carrier = country.getCarrier(simCard.mcc, simCard.mnc);
      this.selectedSimCard = simCard;
      this.elements.sim.choose.html('Slot ' + simNumber + ': ' + carrier);
      this.elements.country.select.val(country.get('code'));
      //this.setCountryPrefix({target: $countrySelect, preventDefault: String});
      //TODO: redo
      this.elements.numberInput.removeAttr('disabled');
      this.elements.country.choose.addClass('action');
      this.countryChooseEnabled = true;
    },

    setCountryPrefix: function (evt) {
      evt.preventDefault();
      var country = this.countryTables
        .getSelectedCountry($(evt.target).val());
      this.elements.country.choose.html(country.get('prefix'));
      this.proposedCountry = country;
    },

    showCountrySelect: function (evt) {
      console.log($(evt.target));
      if (!$(evt.target).hasClass('action')) {
        return;
      }
      this.elements.country.select.focus();
    },

    gotoConfirmation: function (evt) {
      evt.preventDefault();
      var countryCode = this.elements.country.select.val();
      var phoneParts = this._getPhoneParts();

      var isValid = this._checkPhoneNumber(phoneParts, countryCode);
      if (!isValid) {
        return;
      }
      var $confirmationForm = this.$el.find('#register-conf');
      $confirmationForm.find('input[name=msisdn]').val(phoneParts.number);
      $confirmationForm.find('.country-prefix').html(phoneParts.prefix);
      if (this.selectedSimCard && this.proposedCountry.hasMccMnc(
          this.selectedSimCard.mcc, this.selectedSimCard.mnc)) {
        this.mcc = this.selectedSimCard.mcc;
        this.mnc = this.selectedSimCard.mnc;
        console.log('mcc', this.mcc);
        console.log('mnc', this.mnc);
        this.next('confirmation');
      } else {
        this.populateCarriers();
        this.next('network-prompt');
      }
    },

    /**********************PAGE 2 - NETWORK SELECT - OPTIONAL***********/

    populateCarriers: function() {
      /*
       * Again, the carrier has to be selected before the network can be
       * selected
       */
      var $select = this.elements.carrier.select;
      this.elements.carrier.select.html('');
      Object.keys(this.proposedCountry.get('carriers')).
        map(function(carrierName) {
          $select.append(new Option(carrierName, carrierName));
        });
      this.elements.submits.network.attr('disabled', true);
      this.elements.network.choose.removeClass('action');
    },

    populateNetworks: function(carrier) {
      this.elements.network.select.html('');
      var networkList = this.proposedCountry.get('carriers')[carrier],
        _this = this;
      networkList.map(function(network, index) {
        _this.elements.network.select.append(new Option(
            'MCC: ' + network.mcc + ', MNC: ' + network.mnc,
            index
          ));
        });
      console.assert(networkList.length > 0);
      var network = networkList[0];
      console.log('k', this.elements.network.choose);
      this.elements.network.choose.addClass('action');
      this.setToNetwork(network);
    },

    setCarrier: function(evt) {
      var carrier = $(evt.target).val();
      this.elements.carrier.choose.html(carrier);
      this.populateNetworks(carrier);
      this.elements.submits.network.removeAttr('disabled');
    },

    setNetwork: function() {
      var networkIndex = this.$el.find('#network-select').val(),
        carrier = this.$el.find('#carrier-select').val(),
        network = this.proposedCountry.get('carriers')[carrier][networkIndex];
      this.setToNetwork(network);
    },

    setToNetwork: function(network) {
      this.elements.network.choose.html(
        'MCC: ' + network.mcc + ', MNC: ' + network.mnc
      );
      console.log(this.elements.network.choose.html());
      this.mcc = network.mcc;
      this.mnc = network.mnc;
    },

    showSimSelect: function () {
      this.elements.sim.select.focus();
    },

    showCarrierSelect: function () {
      this.elements.carrier.select.focus();
    },

    showNetworkSelect: function (evt) {
      if(!$(evt.target).hasClass('action')) {
        return
      }
      this.elements.network.select.focus();
    },

    networkSelected: function () {
      var stringId = 'sameNumberMultiplePhonesWarning',
        message = global.localisation[global.language][stringId];
      console.log('manually chosen mcc', this.mcc);
      console.log('manually chosen mnc', this.mnc);
      window.alert(message);
      this.next('confirmation');
    },

    /*********************PAGE 3 - CONFIRMATION************************/

    goToValidate: function (evt) {
      evt.preventDefault();

      var phoneParts = this._getPhoneParts('#confirm-phone-page');
      global.router.navigate(
        'validate/' + phoneParts.number + '/' + phoneParts.prefix,
        { trigger: true }
      );
    },

    _getPhoneParts: function (pageId) {
      pageId = pageId || '#login-page';
      var code = this.elements.country.select.val(),
        country = this.countryTables.findWhere({ code: code }),
        prefix = country.get('prefix').substr(1);
      var number = this.$el.find(pageId + ' input[name=msisdn]').val();
      return { prefix: prefix, number: number, complete: prefix + number };
    },

    register: function (evt) {
      var _this = this;
      evt.preventDefault();

      this.$el.find('section.intro > p').hide();
      this.toggleSpinner();

      var phoneParts = this._getPhoneParts('#confirm-phone-page');
      var countryCode = phoneParts.prefix;
      var phoneNumber = phoneParts.number;

      // TODO: Get locale from the i18n object (or from the phone number)
      localStorage.removeItem('isPinSent');
      phoneNumber = phoneNumber.replace(/[^\d]/g, '');
      global.auth
      .register(countryCode, phoneNumber, 'es-ES', _this.mcc, _this.mnc,
        function (err, details) {
          _this.toggleSpinner();
          if (err) {
            return _this.errorRegister(err, details);
          }
          var needsValidation = details;
          if (!needsValidation) {
            var destination = global.auth.get('screenName') ?
                              'inbox' : 'profile';
            global.router.navigate(destination, { trigger: true });
          }
          else {
            localStorage.setItem('isPinSent', 'true');
            localStorage.setItem('phoneAndCC', phoneNumber + '/' + countryCode);
            global.router.navigate(
              'validate/' + phoneNumber + '/' + countryCode,
              { trigger: true }
            );
          }
        }
      );
    },

    _checkPhoneNumber: function (parts, country) {
      if (!country) {
        window.alert(global.localisation[global.language].selectCountryAlert);
        return;
      }

      var international = PhoneNumber.parse(parts.complete, country);

      // show error if cannot parse number or parsed country is different.
      // PhoneNumber always change the country to uppercase, so
      // we should also for this check to work
      country = country.toUpperCase();
      if (!international || country !== international.region) {
        var countrySelect = this.$el.find('#country-select')[0];
        var countryName =
          countrySelect.options[countrySelect.selectedIndex].textContent;
        var message =
          global.localisation[global.language].movilNumberValidationAlert;
        var interpolate = global.l10nUtils.interpolate;
        return window.confirm(interpolate(message, {
          country: countryName,
          number: parts.number,
          prefix: parts.prefix
        }));
      }
      return true;
    },

    toggleSpinner: function () {
      this.$el.find('.spinner').toggle();
      var button = this.$el.find('input[type=submit]');
      button.prop('disabled', !button.prop('disabled'));
    },

    errorRegister: function (err, data) {
      var l10n = global.localisation[global.language];
      var interpolate = global.l10nUtils.interpolate;
      var stringId, message;
      this.$el.find('section.intro > p').show();
      if (err === 'too_recent') {
        /*jshint -W069*/
        /*Justification: camelCase/dotstyle conflict*/
        var tryAfter = (data && data['retry_after']) || 0;
        stringId = 'registerErrorTooRecent';
        message = interpolate(l10n[stringId], {
          minutes: Math.ceil(tryAfter / 60)
        });
      } else if (err === 'too_many') {
        stringId = 'registerErrorTooMany';
      } else if (err === 'old_version' || err === 'bad_token') {
        stringId = 'registerErrorOldVersion';
      } else if (err === 'stale') {
        stringId = 'registerErrorStale';
      } else if (err === 'no_routes') {
        stringId = 'registerErrorNoRoutes';
      } else {
        stringId = 'registerErrorGenericAlert';
        message = interpolate(l10n[stringId], {
          error: JSON.stringify(data, null, ' ')
        });
      }

      if (!message) {
        message = l10n[stringId];
      }
      window.alert(message);
    }
  });

  return Login;
});
