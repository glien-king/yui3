YUI.add('uploader-dd-tests', function(Y) {

    var suite = new Y.Test.Suite('Uploader DD Example Manual Test Suite'),
        Assert = Y.Assert;
            var demo_btn = Y.one("#demo_btn"),
                demo_input = Y.one("#demo_input"),
                demo_output = Y.one("#demo_output");

    suite.add(new Y.Test.Case({

        name: 'Manual',

        'Click Select Files button, select some files, and then upload them.': function() {

                Assert.isTrue(false, " - This test requires manual input.");
         },

        'If in HTML5 mode, drag-and-drop some files over the table, and upload them': function() {

                Assert.isTrue(false, " - This test requires manual input.");
         }
    }));

    Y.Test.Runner.add(suite);

}, '', { requires: [ 'node', 'node-event-simulate'] });
