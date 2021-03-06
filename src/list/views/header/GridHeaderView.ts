import { comparators, helpers } from 'utils/index';
import template from '../../templates/gridheader.hbs';
import InfoButtonView from './InfoButtonView';
import InfoMessageView from './InfoMessageView';
import Marionette from 'backbone.marionette';
import _ from 'underscore';
import { classes } from '../../meta';

/**
 * @name GridHeaderView
 * @memberof module:core.list.views
 * @class GridHeaderView
 * @constructor
 * @description View используемый для отображения заголовка (шапки) списка
 * @extends Marionette.View
 * @param {Object} options Constructor options
 * @param {Array} options.columns массив колонок
 * @param {Object} options.gridEventAggregator ?
 * */

const GridHeaderView = Marionette.View.extend({
    initialize(options) {
        if (!options.columns) {
            throw new Error('You must provide columns definition ("columns" option)');
        }
        if (!options.gridEventAggregator) {
            throw new Error('You must provide grid event aggregator ("gridEventAggregator" option)');
        }

        this.gridEventAggregator = options.gridEventAggregator;
        this.collection = options.gridEventAggregator.collection;

        this.styleSheet = options.styleSheet;
        this.columnIndexOffset = options.showCheckbox ? 1 : 0;
        _.bindAll(this, '__draggerMouseUp', '__draggerMouseMove', '__handleColumnSort');
        this.listenTo(this.gridEventAggregator, 'update:collapse:all', this.__updateCollapseAll);
        this.listenTo(this.collection, 'check:all check:none check:some', this.__updateState);
    },

    template: Handlebars.compile(template),

    className: 'grid-header',

    tagName: 'tr',

    ui: {
        gridHeaderColumn: '.grid-header-column',
        checkbox: '.js-checkbox',
        dots: '.js-dots',
        index: '.js-index'
    },

    events: {
        'pointerdown @ui.checkbox': '__handleCheckboxClick',
        'pointerdown .grid-header-dragger': '__handleDraggerMousedown',
        'pointerdown .js-collapsible-button': '__toggleCollapseAll',
        dragover: '__handleDragOver',
        dragenter: '__handleDragEnter',
        dragleave: '__handleDragLeave',
        drop: '__handleDrop',
        'mouseover .grid-header-column': '__handleColumnSelect',
        'pointerdown .grid-header-column': '__handleColumnSelect',
        'pointerup .grid-header-column-title': '__handleColumnSort',
        'pointerdown .js-help-text-region': '__handleHelpMenuClick',
        mouseleave: '__onMouseLeaveHeader'
    },

    constants: {
        MIN_COLUMN_WIDTH: 50
    },

    templateContext() {
        return {
            columns: this.options.columns.map(column =>
                Object.assign({}, column, {
                    sortingAsc: column.sorting === 'asc',
                    sortingDesc: column.sorting === 'desc',
                    width: column.width ? (column.width > 1 ? `${column.width}px` : `${column.width * 100}%`) : ''
                })
            ),
            showCheckbox: this.options.showCheckbox && !!this.options.columns.length,
            cellClass: `js-cell_selection ${this.options.showRowIndex ? 'cell_selection-index' : 'cell_selection'}`
        };
    },

    onRender() {
        if (!this.options.columns.length) {
            return;
        }
        if (this.options.isTree) {
            this.$el
                .find('.header-column-wrp')[0]
                .insertAdjacentHTML('afterbegin', `<span class="collapsible-btn js-collapsible-button ${this.getOption('expandOnShow') === true ? classes.expanded : ''}"></span>`);
        }

        this.ui.gridHeaderColumn.each((i, el) => {
            const column = this.options.columns[i];
            const helpText = column.helpText;

            if (helpText) {
                this.addRegion(`popoutRegion${i}`, { el: el.querySelector('.js-help-text-region') });

                const infoPopout = Core.dropdown.factory.createPopout({
                    buttonView: InfoButtonView,
                    panelView: InfoMessageView,
                    panelViewOptions: {
                        text: helpText
                    },
                    popoutFlow: 'right',
                    customAnchor: true,
                    class: 'collection-grid-header__help'
                });
                this.showChildView(`popoutRegion${i}`, infoPopout);
            }
        });
    },

    updateSorting() {
        this.render();
    },

    __handleCheckboxClick() {
        this.collection.toggleCheckAll();
    },

    __handleColumnSort(event) {
        if (this.options.columnSort === false) {
            return;
        }
        if (event.target.className.includes('js-collapsible-button')) {
            return;
        }
        const column = this.options.columns[Array.prototype.indexOf.call(this.el.children, event.currentTarget.parentNode.parentNode) - this.columnIndexOffset];
        const sorting = column.sorting === 'asc' ? 'desc' : 'asc';
        this.options.columns.forEach(c => (c.sorting = null));
        column.sorting = sorting;
        let comparator = sorting === 'desc' ? column.sortDesc : column.sortAsc;
        if (!comparator) {
            comparator = helpers.comparatorFor(comparators.getComparatorByDataType(column.dataType || column.type, sorting), column.key);
        }
        if (comparator) {
            this.updateSorting();
            this.trigger('onColumnSort', column, comparator);
        }
    },

    __handleDraggerMousedown(e) {
        this.__stopDrag();
        this.__startDrag(e);
        this.trigger('header:columnResizeStarted');
        return false;
    },

    __getElementOuterWidth(el) {
        return el.getBoundingClientRect().width;
    },

    __startDrag(e) {
        const dragger = e.target;
        const columnNode = dragger.parentNode.parentNode;

        const draggedColumn = {
            el: columnNode,
            initialWidth: 0,
            index: 0
        };

        this.dragContext = {
            pageOffsetX: e.pageX,
            dragger,
            draggedColumn,
            resizingElement: columnNode
        };

        this.__updateColumnAndNeighbourWidths(columnNode);

        dragger.classList.add('active');

        document.addEventListener('pointermove', this.__draggerMouseMove);
        document.addEventListener('pointerup', this.__draggerMouseUp);
    },

    __stopDrag() {
        if (!this.dragContext) {
            return;
        }

        const draggerElement = this.dragContext.dragger;
        this.__triggerUpdateWidth(draggerElement);

        draggerElement.classList.remove('active');
        this.dragContext = null;

        document.removeEventListener('pointermove', this.__draggerMouseMove);
        document.removeEventListener('pointerup', this.__draggerMouseUp);
    },

    __draggerMouseMove(e: MouseEvent) {
        if (!this.dragContext) {
            return;
        }

        const ctx = this.dragContext;
        const delta = e.pageX - ctx.pageOffsetX;

        if (delta !== 0) {
            const index = ctx.draggedColumn.index;
            this.__setColumnWidth(index, this.dragContext.draggedColumn.initialWidth + delta);
        }

        return false;
    },

    __draggerMouseUp() {
        this.__stopDrag();

        this.trigger('header:columnResizeFinished');
        return false;
    },

    __triggerUpdateWidth(element) {
        const index = Array.from(this.el.querySelectorAll('.grid-header-dragger')).indexOf(element);
        const columnElement = this.el.querySelectorAll('.grid-header-column').item(index);

        this.trigger('update:width', { index, newColumnWidth: this.__getElementOuterWidth(columnElement) });
    },

    onAttach() {
        this.trigger('set:emptyView:width', this.el.scrollWidth);
    },

    __setColumnWidth(index: number, newColumnWidth: number) {
        if (newColumnWidth < this.constants.MIN_COLUMN_WIDTH) {
            return;
        }

        const newColumnWidthPX = `${newColumnWidth}px`;
        this.el.children[index + this.columnIndexOffset].style.minWidth = newColumnWidthPX;
        this.el.children[index + this.columnIndexOffset].style.width = newColumnWidthPX;
        this.options.columns[index].width = newColumnWidth;

        //this.trigger('update:width', index, newColumnWidth, this.el.scrollWidth);
        //this.gridEventAggregator.trigger('singleColumnResize', newColumnWidth);
        // this.el.style.width = `${this.dragContext.tableInitialWidth + delta + 1}px`;
    },

    __updateColumnAndNeighbourWidths(column: Node) {
        for (let i = 0; i < this.options.columns.length; i++) {
            const child = this.el.children[i + this.columnIndexOffset];
            const width = this.__getElementOuterWidth(child);
            if (child === column) {
                this.dragContext.draggedColumn.index = i;
                this.dragContext.draggedColumn.initialWidth = width;
                break;
            } else if (!this.options.columns[i].width) {
                // freeze width to previous columns
                this.__setColumnWidth(i, width);
            }
        }
    },

    __toggleCollapseAll() {
        this.__updateCollapseAll(!this.collapsed);
        this.gridEventAggregator.trigger('toggle:collapse:all', this.collapsed);
    },

    __updateCollapseAll(collapsed) {
        this.collapsed = collapsed;
        this.$('.js-collapsible-button').toggleClass(classes.expanded, !collapsed);
    },

    __handleDragOver(event: MouseEvent) {
        if (!this.collection.draggingModel) {
            return;
        }
        // prevent default to allow drop
        event.preventDefault();
    },

    __handleDragEnter(event: MouseEvent) {
        this.el.classList.add(classes.dragover);
    },

    __handleDragLeave(event: MouseEvent) {
        this.el.classList.remove(classes.dragover);
    },

    __handleDrop(event: MouseEvent) {
        event.preventDefault();
        if (this.__allowDrop()) {
            this.gridEventAggregator.trigger('drag:drop', this.collection.draggingModel);
        }
    },

    __allowDrop() {
        if (!this.collection.draggingModel || this.collection.indexOf(this.collection.draggingModel) < 0) {
            return false;
        }
        return true;
    },

    __handleColumnSelect(event) {
        this.trigger('handleColumnSelect', {
            event,
            el: event.currentTarget,
            model: this.options.columns[Array.prototype.indexOf.call(this.el.children, event.currentTarget) - this.columnIndexOffset]
        });
    },

    __onMouseLeaveHeader(event) {
        this.trigger('handleLeave', event);
    },

    __updateState(collection, checkedState) {
        switch (checkedState) {
            case 'checked':
                this.ui.checkbox.addClass(classes.checked);
                this.ui.checkbox.removeClass(classes.checked_some);
                break;
            case 'checkedSome':
                this.ui.checkbox.removeClass(classes.checked);
                this.ui.checkbox.addClass(classes.checked_some);
                break;
            case 'unchecked':
            default:
                this.ui.checkbox.removeClass(classes.checked);
                this.ui.checkbox.removeClass(classes.checked_some);
                break;
        }
    }
});

export default GridHeaderView;
