"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOne = exports.findOneAndUpdate = exports.findById = exports.DBRepository = void 0;
class DBRepository {
    model;
    constructor(model) {
        this.model = model;
    }
    async create({ data, options, }) {
        return await this.model.create(data, options);
    }
    ;
    async findOne({ filter, select, options }) {
        const doc = this.model.findOne(filter).select(select || "");
        if (options?.populate) {
            doc.populate(options.populate);
        }
        if (options?.lean) {
            doc.lean(options.lean);
        }
        return await doc.exec();
    }
    ;
    async updateOne({ filter, data, options, }) {
        return await this.model.updateOne(filter, data, options);
    }
    ;
    async findByIdAndUpdate({ id, update, options = { new: true }, }) {
        return this.model.findByIdAndUpdate(id, { ...update, $inc: { __v: 1 } }, options);
    }
    ;
    async deleteOne({ filter, }) {
        return this.model.deleteOne(filter);
    }
    ;
}
exports.DBRepository = DBRepository;
const findById = async ({ model, id, select = "", }) => {
    return await model.findById(id).select(select);
};
exports.findById = findById;
const findOneAndUpdate = async ({ model, filter = {}, data = {}, select = "", options = { runValidators: true, new: true }, }) => {
    return await model
        .findOneAndUpdate(filter, {
        ...data,
        $inc: { __v: 1 },
    }, options)
        .select(select);
};
exports.findOneAndUpdate = findOneAndUpdate;
const deleteOne = async ({ model, filter = {}, }) => {
    return await model.deleteOne(filter);
};
exports.deleteOne = deleteOne;
