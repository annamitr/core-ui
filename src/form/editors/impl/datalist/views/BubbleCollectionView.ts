import BubbleItemView from './BubbleItemView';

export default Marionette.CollectionView.extend({
    initialize(options) {
        this.collection = options.collection;
    },

    className: 'bubbles__list',

    childView: BubbleItemView,

    childViewOptions() {
        return {
            parent: this.$el,
            showButtonSubtext: this.options.showButtonSubtext,
            subtextProperty: this.options.subtextProperty,
            ...this.options.bubbleItemViewOptions
        };
    },

    updateEnabled(enabled) {
        this.children.each(cv => {
            if (cv.updateEnabled) {
                cv.updateEnabled(enabled);
            }
        });
    }
});
