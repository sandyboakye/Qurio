/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema
        .createTable('users', (table) => {
            table.increments('id').primary();
            table.string('email').unique();
            table.string('password');
            table.string('role').defaultTo('user');
            table.boolean('is_active').defaultTo(true);
            table.integer('max_qrs').defaultTo(10);
            table.boolean('has_enterprise').defaultTo(false);
            table.timestamp('created_at').defaultTo(knex.fn.now());

            table.index('email');
        })
        .createTable('qr_codes', (table) => {
            table.increments('id').primary();
            table.string('short_code').unique().notNullable();
            table.string('name').notNullable();
            table.text('original_url').notNullable();
            table.text('current_url').notNullable();
            table.text('qr_image_url');
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('updated_at').defaultTo(knex.fn.now());
            table.boolean('is_active').defaultTo(true);
            table.integer('scan_count').defaultTo(0);
            table.string('color_dark').defaultTo('#000000');
            table.string('color_light').defaultTo('#ffffff');
            table.text('logo_image');
            table.string('design_style').defaultTo('square');
            table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');

            table.index('short_code');
        })
        .createTable('scans', (table) => {
            table.increments('id').primary();
            table.integer('qr_code_id').references('id').inTable('qr_codes').onDelete('CASCADE');
            table.string('ip_address');
            table.string('user_agent');
            table.string('device_type');
            table.string('country');
            table.string('city');
            table.string('browser');
            table.string('os');
            table.string('referrer');
            table.timestamp('scanned_at').defaultTo(knex.fn.now());
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema
        .dropTableIfExists('scans')
        .dropTableIfExists('qr_codes')
        .dropTableIfExists('users');
};
