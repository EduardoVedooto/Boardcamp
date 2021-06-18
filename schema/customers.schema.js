import Joi from "joi";
import Extension from "@joi/date";
const JoiDate = Joi.extend(Extension);


const customersSchema = data => {
    const schema = Joi.object({
        name: Joi.string().trim().required(),
        birthday: JoiDate.date().format("YYYY-MM-DD"),
        phone: Joi.string().trim().pattern(/^[\S]+[0-9]{10,11}$/),
        cpf: Joi.string().trim().pattern(/^[\S]+[0-9]{11}$/),
    });
    return schema.validate(data);
};

export default customersSchema;