const mongoose = require("mongoose");

const SheetSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            default: "Untitled Sheet"
        },

        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        rows: {
            type: Number,
            required: true
        },

        cols: {
            type: Number,
            required: true
        },

        cells: {
            type: Map,
            of: new mongoose.Schema({
                value: String,
                formula: String,


                history: [
                    {
                        editedById: {
                            type: mongoose.Schema.Types.ObjectId,
                            ref: "User",
                        },

                        editedByName: String,
                        editedByEmail: String,

                        oldValue: String,
                        newValue: String,

                        timestamp: {
                            type: Date,
                            default: Date.now,
                        },
                    },
                ],

            }),
            default: {},
        },
        sharedWith: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User"
                },
                permission: {
                    type: String,
                    enum: ["view", "edit"],
                    default: "view"
                }
            }
        ]
    },
    { timestamps: true }
);

module.exports = mongoose.model("Sheet", SheetSchema);
