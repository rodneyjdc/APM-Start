import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Supplier } from '../../suppliers/supplier';
import { Product } from '../product';

import { ProductService } from '../product.service';
import { EMPTY, Subject, catchError, combineLatest, map, tap } from 'rxjs';

@Component({
  selector: 'pm-product-detail',
  templateUrl: './product-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDetailComponent {

  private errorMessageSubject = new Subject<string>();
  errorMessage$ = this.errorMessageSubject.asObservable();

  product$ = this.productService.selectedProduct$
  .pipe(
    catchError(err => {
      this.errorMessageSubject.next(err);
      return EMPTY;
    })
  )

  pageTitle$ = this.product$
  .pipe(
    map(product => product ? `Product Detail for: ${product.productName}`: null)
  )

  productSuppliers$ = this.productService.selectedProductSuppliers$
  .pipe(
    tap(suppliers => console.log(`suppliers: `, suppliers)),
    catchError(err => {
      this.errorMessageSubject.next(err);
      return EMPTY;
    })
  )

  // combining all streams for cleaner template binding
  // not including errorMessage stream because combineLatest
  //    won't emit until all streams included emit a value
  viewModel$ = combineLatest([
    this.product$,
    this.pageTitle$,
    this.productSuppliers$
  ]).pipe(
    map(([product, pageTitle, productSuppliers]) => 
      ({ product, pageTitle, productSuppliers})
    )
  );

  constructor(private productService: ProductService) { }

}
