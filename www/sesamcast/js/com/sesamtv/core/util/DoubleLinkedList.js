define(function () {
    /*
     * Doubly Linked List implementation in JavaScript
     * Copyright (c) 2009 Nicholas C. Zakas
     *
     * Permission is hereby granted, free of charge, to any person obtaining a copy
     * of this software and associated documentation files (the "Software"), to deal
     * in the Software without restriction, including without limitation the rights
     * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
     * copies of the Software, and to permit persons to whom the Software is
     * furnished to do so, subject to the following conditions:
     *
     * The above copyright notice and this permission notice shall be included in
     * all copies or substantial portions of the Software.
     *
     * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
     * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
     * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
     * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
     * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
     * THE SOFTWARE.
     */

    /**
     * A linked list implementation in JavaScript.
     * modified by Bytel
     *
     * @class com.sesamtv.core.util.DoublyLinkedList
     * @copyright copyright Nicholas C. Zakas
     * @constructor
     */
    function DoublyLinkedList() {
        /**
         * Pointer to first item in the list.
         * @property _head
         * @type Object
         * @private
         */
        this._head = null;

        /**
         * Pointer to last item in the list.
         * @property _tail
         * @type Object
         * @private
         */
        this._tail = null;

        /**
         * The number of items in the list.
         * @property length
         * @type Number
         */
        this.length = 0;
    }

    DoublyLinkedList.prototype = {
        //restore constructor
        constructor: DoublyLinkedList,
        /**
         * @method firstNode
         * @returns {Object}
         */
        firstNode: function () {
            return this._head;
        },
        /**
         * @method lastNode
         * @returns {Object}
         */
        lastNode: function () {
            return this._tail;
        },
        /**
         * @method reverse
         * @return {com.sesamtv.core.util.DoublyLinkedList}
         */
        reverse: function () {
            var arr = new DoublyLinkedList(), node = this._tail;
            arr.add(this._tail.data);
            while (node = node.prev) {
                arr.add(node.data);
            }
            return arr;
        },
        /**
         * Appends some data to the end of the list. This method traverses
         * the existing list and places the value at the end in a new item.
         * @method add
         * @param {*} data The data to add to the list.
         *
         */
        add: function (data) {

            //create a new item object, place data in
            var node = {
                data: data,
                next: null,
                prev: null
            };

            //special case: no items in the list yet
            if (this.length == 0) {
                this._head = node;
                this._tail = node;
            } else {

                //attach to the tail node
                this._tail.next = node;
                node.prev = this._tail;
                this._tail = node;
            }

            //don't forget to update the count
            this.length++;
            return this;
        },

        /**
         * Retrieves the data in the given position in the list.
         * @method item
         * @param {Number} index The zero-based index of the item whose value
         *      should be returned.
         * @return {Object} The value in the "data" portion of the given item
         *      or null if the item doesn't exist.
         */
        item: function (index) {

            //check for out-of-bounds values
            if (index > -1 && index < this.length) {
                var current = this._head,
                    i = 0;

                while (i++ < index) {
                    current = current.next;
                }

                return current;
            } else {
                return null;
            }
        },
        indexOf:function(){

        },
        /**
         * Removes the item from the given location in the list.
         * @method remove
         * @param {Number} index The zero-based index of the item to remove.
         * @return {*} The data in the given position in the list or null if
         *      the item doesn't exist.
         */
        remove: function (index) {
            //check for out-of-bounds values
            if (index > -1 && index < this.length) {

                var current = this._head,
                    i = 0;

                //special case: removing first item
                if (index === 0) {
                    this._head = current.next;

                    /*
                     * If there's only one item in the list and you remove it,
                     * then this._head will be null. In that case, you should
                     * also set this._tail to be null to effectively destroy
                     * the list. Otherwise, set the previous pointer on the new
                     * this._head to be null.
                     */
                    if (!this._head) {
                        this._tail = null;
                    } else {
                        this._head.prev = null;
                    }

                    //special case: removing last item
                } else if (index === this.length - 1) {
                    current = this._tail;
                    this._tail = current.prev;
                    this._tail.next = null;
                } else {

                    //find the right location
                    while (i++ < index) {
                        current = current.next;
                    }

                    //skip over the item to remove
                    current.prev.next = current.next;
                }

                //decrement the length
                this.length--;

                //return the value
                return current.data;

            } else {
                return null;
            }
        },
        /**
         * Converts the list into an array.
         * @method toArray
         * @return {Array} An array containing all of the data in the list.
         */
        toArray: function () {
            var result = [],
                current = this._head;
            while (current) {
                result.push(current.data);
                current = current.next;
            }
            return result;
        },
        /**
         * Converts the list into a string representation.
         * @method toString
         * @return {String} A string representation of the list.
         */
        toString: function () {
            return this.toArray().toString();
        }
    };
    return DoublyLinkedList;
});