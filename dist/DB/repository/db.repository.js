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
    async insertMany({ data, }) {
        return (await this.model.insertMany(data));
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
    async findById({ id, select, options }) {
        const doc = this.model.findById(id).select(select || "");
        if (options?.populate) {
            doc.populate(options.populate);
        }
        if (options?.lean) {
            doc.lean(options.lean);
        }
        return await doc.exec();
    }
    ;
    async find({ filter, select, options }) {
        const doc = this.model.find(filter || {}).select(select || "");
        if (options?.populate) {
            doc.populate(options.populate);
        }
        if (options?.lean) {
            doc.lean(options.lean);
        }
        if (options?.skip) {
            doc.skip(options.skip);
        }
        if (options?.limit) {
            doc.limit(options.limit);
        }
        return await doc.exec();
    }
    ;
    async paginate({ filter = {}, select, options = {}, page = "all", size = 5 }) {
        let docsCount = undefined;
        let pages = undefined;
        if (page !== "all") {
            page = Math.floor(page < 1 ? 1 : page);
            options.limit = Math.floor(size < 1 || !size ? 5 : size);
            options.skip = (page - 1) * options.limit;
            docsCount = await this.model.countDocuments(filter);
            pages = Math.ceil(docsCount / options.limit);
        }
        const result = await this.find({ filter, select, options });
        return { docsCount, limit: options.limit, pages, currentPage: page !== "all" ? page : undefined, result };
    }
    ;
    async updateOne({ filter, data, options, }) {
        if (Array.isArray(data)) {
            data.push({
                $set: { __v: { $add: ["$__v", 1] }, }
            });
            return await this.model.updateOne(filter || {}, data, options);
        }
        return await this.model.updateOne(filter || {}, { ...data, $inc: { __v: 1 } }, options);
    }
    ;
    async findByIdAndUpdate({ id, update, options = { new: true }, }) {
        return this.model.findByIdAndUpdate(id, { ...update, $inc: { __v: 1 } }, options);
    }
    ;
    async findOneAndUpdate({ filter, update, options = { new: true }, }) {
        return this.model.findOneAndUpdate(filter, { ...update, $inc: { __v: 1 } }, options);
    }
    ;
    async deleteOne({ filter, }) {
        return this.model.deleteOne(filter);
    }
    ;
    async findOneAndDelete({ filter, }) {
        return this.model.findOneAndDelete(filter);
    }
    ;
    async deleteMany({ filter, }) {
        return this.model.deleteMany(filter);
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
