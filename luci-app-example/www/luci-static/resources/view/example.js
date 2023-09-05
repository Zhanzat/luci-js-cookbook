'use strict';
'require form';
'require uci';
'require dom';
'require ui';
'require fs';
'require rpc';
'require poll';

var callBoardInfo= rpc.declare({
    object: 'system',
    method: 'board',
    params: [],
    expect: {}
});

var CBIBoardInfo = form.TextValue.extend({
    renderWidget: function (section_id, option_index, cfgvalue) {
        var node = this.super('renderWidget', [section_id, option_index, cfgvalue]);
        
        L.resolveDefaultcallBoardInfo(), 'unknown').then(function (result) {
            console.log(result)
            var contentNode = [
                E('p', {}, 'Hostname : ' + result['hostname']),
                E('p', {}, 'Model : ' + result['model']),
                E('p', {}, 'Board name : ' + result['board_name'])
            ]

            dom.content(node, contentNode)
        })

        return node
    }
});

var CBIPingAddress = form.Value.extend({
    renderWidget: function (section_id, option_index, cfgvalue) {
        var node = this.super('renderWidget', [section_id, option_index, cfgvalue]);
        
        dom.append(node,
            E('button', {
                'class': 'btn cbi-button-edit',
                'id': 'custom-ping-button',
                'style': 'vertical-align: bottom; margin-left: 1em;',
                'click': ui.createHandlerFn(this, function () {
                    L.resolveDefault(ui.pingDevice('http', cfgvalue), 'error').then(
                        result => {
                            if (result === 'error') alert('ERROR: Device ' + cfgvalue + ' is not reachable');
                            else if (result === 'null') alert('The connectivity check timed out');
                            else alert('Device ' + cfgvalue + ' is reachable');
                        })
                        .catch((error) => {
                            alert(error)
                        });
                })
            }, 'Ping'))
        return node
    }
});

var CBIReadFile = form.Value.extend({
    renderWidget: function (section_id, option_index, cfgvalue) {
        var node = this.super('renderWidget', [section_id, option_index, cfgvalue]);
        dom.append(node,
            E('button', {
                'class': 'btn cbi-button-edit',
                'style': 'vertical-align: bottom; margin-left: 1em;',
                'click': ui.createHandlerFn(this, function () {
                    L.resolveDefault(fs.read(cfgvalue), 'Error: Could not read file').then(
                        result => {
                                ui.showModal(_('File Content'), [
                                    E('p', _(result)),
                                    E('div', { 'class': 'right' }, [
                                        E('button', {
                                            'class': 'btn cbi-button-edit',
                                            'click': ui.createHandlerFn(this, function () {
                                                ui.hideModal();
                                            })
                                        }, [_('Close modal')]),

                                    ])
                                ]);
                        })
                }),
            }, 'Read'))
        return node
    }
});

var CBIMultiValue = form.MultiValue.extend({
    renderWidget: function (section_id, option_index, cfgvalue) {
        var node = this.super('renderWidget', [section_id, option_index, cfgvalue]);

        dom.append(node,
            E('button', {
                'class': 'btn cbi-button-default',
                'style': '',
                'click': ui.createHandlerFn(this, function () {

                    uci.set('example', section_id, 'multi_choice', 'White');
                    uci.save()
                        .then(L.bind(ui.changes.init, ui.changes))
                        .then(L.bind(ui.changes.apply, ui.changes))
                        .then(ui.hideModal());
                })
            }, 'Set default'))

        return node
    }
});

function showCurrentTime() {
    var date = new Date().toLocaleString();

    var datetimeNode = E('p', {'class' : '', 'style': 'color: #004280;'}, date)
    $('h3').html(datetimeNode)
}

return L.view.extend({
    load: function () {
        return Promise.all([
            uci.load('example_helper')
        ]);
    },
    render: function () {   
        var m, s, o;

        m = new form.Map('example', 'Example form');
        
        s = m.section(form.TypedSection, 'first_section', 'The first section',
            'This sections maps "config example first_section" of /etc/config/example');

        s.anonymous = true;
        
        o = s.option(form.Flag, 'some_bool', 'A checkbox option');
       
        
        o = s.option(form.ListValue, 'some_choice', 'A select element');
        var choiceList = uci.sections('example_helper', 'some_choice')
        choiceList.forEach(choice => o.value(choice['id'], choice['name']));

        o = s.option(CBIMultiValue, "multi_choice", "A select multiple elements")
        choiceList.forEach(choice => o.value(choice['name']));
        o.display_size = 4;

        o.write = function (section_id, value) {
            uci.set('example', section_id, 'multi_choice', value.join(' '));
        }

        o = s.option(CBIPingAddress, 'some_address', 'IP-Address');

        o = s.option(CBIReadFile, 'some_file_dir', 'File directory');

        o = s.option(CBIBoardInfo, 'some_info', 'Board Info');

        var pollfunction = L.bind(showCurrentTime, this);
        poll.add(pollfunction, 1);

        return m.render()
    }
});